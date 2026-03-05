import type { CheckpointMode, RunStatus } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";

type SyncInputItem = {
  sku?: string;
  itemId?: string;
  variationKey?: string;
  lastModified?: string;
};

type EnqueueBody = {
  shop?: string;
  ebayAccountId?: number;
  mode?: "rolling" | "full";
  cursor?: string | null;
  nextCursor?: string | null;
  fullScanComplete?: boolean;
  items?: SyncInputItem[];
};

type RunCounters = {
  totalItems: number;
  processedItems: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  conflictCount: number;
  missingCount: number;
  errorCount: number;
};

function unauthorizedResponse() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function parseMode(rawMode?: string): CheckpointMode {
  return rawMode === "full" ? "full" : "rolling";
}

function parseLastModified(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildFinalRunStatus(counters: RunCounters): RunStatus {
  if (counters.errorCount === 0 && counters.conflictCount === 0) {
    return "succeeded";
  }
  if (counters.processedItems > 0) {
    return "partial";
  }
  return "failed";
}

async function notifyRunIssue(input: {
  shop: string;
  runId: number;
  status: RunStatus;
  errorNotifyEmail?: string | null;
  counters: RunCounters;
}) {
  if (input.status === "succeeded") return;

  const payload = {
    type: "sync_run_issue",
    shop: input.shop,
    runId: input.runId,
    status: input.status,
    notifyEmail: input.errorNotifyEmail ?? null,
    counters: input.counters,
    createdAt: new Date().toISOString(),
  };

  console.warn("[sync-notify]", JSON.stringify(payload));

  const webhook = process.env.ERROR_NOTIFY_WEBHOOK_URL?.trim();
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[sync-notify] webhook failed", error);
  }
}

async function ensureAuthorized(request: Request) {
  const sharedSecret = process.env.CRON_SHARED_SECRET?.trim();
  if (!sharedSecret) return;

  const token = request.headers.get("x-cron-secret")?.trim();
  if (token === sharedSecret) return;

  try {
    await authenticate.admin(request);
  } catch {
    throw unauthorizedResponse();
  }
}

async function parseRequestBody(request: Request): Promise<EnqueueBody> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as EnqueueBody;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const ebayAccountIdRaw = form.get("ebayAccountId");
    const parsedAccountId =
      typeof ebayAccountIdRaw === "string" && ebayAccountIdRaw.length > 0
        ? Number(ebayAccountIdRaw)
        : undefined;

    let parsedItems: SyncInputItem[] = [];
    const itemsJson = form.get("itemsJson");
    if (typeof itemsJson === "string" && itemsJson.trim().length > 0) {
      try {
        const candidate = JSON.parse(itemsJson);
        if (Array.isArray(candidate)) {
          parsedItems = candidate as SyncInputItem[];
        }
      } catch {
        parsedItems = [];
      }
    }

    return {
      shop: form.get("shop")?.toString() || undefined,
      mode: (form.get("mode")?.toString() as "rolling" | "full") || undefined,
      ebayAccountId:
        parsedAccountId !== undefined && Number.isFinite(parsedAccountId)
          ? parsedAccountId
          : undefined,
      cursor: form.get("cursor")?.toString() || null,
      nextCursor: form.get("nextCursor")?.toString() || null,
      fullScanComplete: form.get("fullScanComplete")?.toString() === "true",
      items: parsedItems,
    };
  }

  return {};
}

async function resolveStore(shop: string) {
  return db.store.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

async function resolveEbayAccount(storeId: number, requestedId?: number) {
  if (requestedId) {
    return db.ebayAccount.findFirst({
      where: { id: requestedId, storeId },
    });
  }

  const connected = await db.ebayAccount.findFirst({
    where: { storeId, status: "connected" },
    orderBy: { id: "asc" },
  });

  if (connected) return connected;

  return db.ebayAccount.create({
    data: {
      storeId,
      label: "stub-account-1",
      refreshTokenEnc: "stub",
      scopes: "",
      status: "connected",
    },
  });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  try {
    await ensureAuthorized(request);
  } catch (response) {
    return response as Response;
  }

  let body: EnqueueBody = {};
  try {
    body = await parseRequestBody(request);
  } catch {
    body = {};
  }

  const shop = body.shop ?? "unknown-shop.local";
  const mode = parseMode(body.mode);
  const items = Array.isArray(body.items) ? body.items : [];

  const store = await resolveStore(shop);
  const ebayAccount = await resolveEbayAccount(store.id, body.ebayAccountId);

  if (!ebayAccount) {
    return Response.json(
      {
        accepted: false,
        error: "ebay_account_not_found",
        shop,
        storeId: store.id,
      },
      { status: 400 },
    );
  }

  const run = await db.syncRun.create({
    data: {
      storeId: store.id,
      ebayAccountId: ebayAccount.id,
      mode,
      status: "running",
      message: "Sync started.",
    },
  });

  const counters: RunCounters = {
    totalItems: items.length,
    processedItems: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    conflictCount: 0,
    missingCount: 0,
    errorCount: 0,
  };

  for (const item of items) {
    const sku = item.sku?.trim();
    const ebayItemId = item.itemId?.trim() || null;
    const incomingModified = parseLastModified(item.lastModified);

    if (!sku) {
      counters.errorCount += 1;
      await db.syncError.create({
        data: {
          runId: run.id,
          storeId: store.id,
          ebayAccountId: ebayAccount.id,
          errorCode: "SKU_MISSING",
          errorMessage: "SKU is required for synchronization.",
          ebayItemId,
          payload: JSON.stringify(item),
        },
      });
      continue;
    }

    const existing = await db.skuLink.findUnique({
      where: { storeId_sku: { storeId: store.id, sku } },
    });

    if (existing && existing.ebayAccountId !== ebayAccount.id) {
      counters.conflictCount += 1;
      const accountIds = [existing.ebayAccountId, ebayAccount.id].sort(
        (a, b) => a - b,
      );
      await db.skuConflict.upsert({
        where: { storeId_sku: { storeId: store.id, sku } },
        create: {
          storeId: store.id,
          sku,
          foundInAccounts: JSON.stringify(accountIds),
          status: "open",
        },
        update: {
          foundInAccounts: JSON.stringify(accountIds),
          lastDetectedAt: new Date(),
          status: "open",
        },
      });

      await db.skuLink.update({
        where: { id: existing.id },
        data: {
          syncStatus: "conflict",
          lastError: `Conflict: detected in multiple accounts (${accountIds.join(", ")}).`,
          lastSeenInRunId: run.id,
        },
      });
      continue;
    }

    const shouldSkip =
      Boolean(existing) &&
      Boolean(existing?.ebayLastModified) &&
      Boolean(incomingModified) &&
      incomingModified!.getTime() <= existing!.ebayLastModified!.getTime();

    if (shouldSkip && existing) {
      counters.skippedCount += 1;
      await db.skuLink.update({
        where: { id: existing.id },
        data: {
          syncStatus: "skipped",
          lastSeenInRunId: run.id,
          updatedAt: new Date(),
        },
      });
      continue;
    }

    await db.skuLink.upsert({
      where: { storeId_sku: { storeId: store.id, sku } },
      create: {
        storeId: store.id,
        sku,
        ebayAccountId: ebayAccount.id,
        ebayItemId,
        ebayVariationKey: item.variationKey?.trim() || null,
        ebayLastModified: incomingModified,
        syncStatus: "ok",
        lastSyncAt: new Date(),
        lastSeenInRunId: run.id,
        lastError: null,
      },
      update: {
        ebayAccountId: ebayAccount.id,
        ebayItemId,
        ebayVariationKey: item.variationKey?.trim() || null,
        ebayLastModified: incomingModified,
        syncStatus: "ok",
        lastSyncAt: new Date(),
        lastSeenInRunId: run.id,
        lastError: null,
      },
    });

    counters.processedItems += 1;
    if (existing) {
      counters.updatedCount += 1;
    } else {
      counters.createdCount += 1;
    }

  }

  if (body.fullScanComplete) {
    const missingResult = await db.skuLink.updateMany({
      where: {
        storeId: store.id,
        ebayAccountId: ebayAccount.id,
        lastSeenInRunId: { not: run.id },
      },
      data: {
        syncStatus: "missing_on_ebay",
        lastError: "SKU not detected in the latest completed full scan.",
      },
    });
    counters.missingCount = missingResult.count;
  }

  await db.syncCheckpoint.upsert({
    where: { ebayAccountId: ebayAccount.id },
    create: {
      ebayAccountId: ebayAccount.id,
      cursor: body.nextCursor ?? body.cursor ?? null,
      mode,
      lastError: counters.errorCount > 0 ? "Run completed with errors." : null,
    },
    update: {
      cursor: body.nextCursor ?? body.cursor ?? null,
      mode,
      lastError: counters.errorCount > 0 ? "Run completed with errors." : null,
    },
  });

  const finalStatus = buildFinalRunStatus(counters);
  await db.syncRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      endedAt: new Date(),
      totalItems: counters.totalItems,
      processedItems: counters.processedItems,
      createdCount: counters.createdCount,
      updatedCount: counters.updatedCount,
      skippedCount: counters.skippedCount,
      conflictCount: counters.conflictCount,
      missingCount: counters.missingCount,
      errorCount: counters.errorCount,
      message:
        items.length === 0
          ? "No items provided. Run recorded with no-op."
          : "Sync core processing finished.",
    },
  });

  await notifyRunIssue({
    shop: store.shop,
    runId: run.id,
    status: finalStatus,
    errorNotifyEmail: store.errorNotifyEmail,
    counters,
  });

  return Response.json(
    {
      accepted: true,
      jobId: run.id,
      mode,
      shop,
      storeId: store.id,
      ebayAccountId: ebayAccount.id,
      counters,
      note: "Phase-3 core sync executed for provided input items.",
    },
    { status: 200 },
  );
};
