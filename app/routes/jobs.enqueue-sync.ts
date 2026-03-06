import type { CheckpointMode, RunStatus } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { unauthenticated } from "../shopify.server";

type SyncInputItem = {
  sku?: string;
  itemId?: string;
  variationKey?: string;
  lastModified?: string;
  title?: string;
  description?: string;
  quantity?: number;
  imageUrls?: string[];
};

type EnqueueBody = {
  shop?: string;
  ebayAccountId?: number;
  mode?: "rolling" | "full";
  cursor?: string | null;
  nextCursor?: string | null;
  fullScanComplete?: boolean;
  limit?: number;
  items?: SyncInputItem[];
};

type EbayInventoryItem = {
  sku?: string;
  product?: {
    title?: string;
    description?: string;
    imageUrls?: string[];
  };
  availability?: {
    shipToLocationAvailability?: {
      quantity?: number;
    };
  };
};

type EbayInventoryPage = {
  inventoryItems?: EbayInventoryItem[];
  next?: string;
  total?: number;
  limit?: number;
};

type EbayTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
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

type ShopifyUpsertResult = {
  productId: string | null;
  variantId: string | null;
  error: string | null;
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

function getEbayApiBaseUrl() {
  return process.env.EBAY_ENV === "sandbox"
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

function getEbayIdentityBaseUrl() {
  return process.env.EBAY_ENV === "sandbox"
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

function toBasicAuth(id: string, secret: string) {
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(input, init);
    if (response.status !== 429 && (response.status < 500 || response.status > 599)) {
      return response;
    }
    lastResponse = response;
    if (i < attempts - 1) {
      await sleep(300 * 2 ** i);
    }
  }

  return lastResponse as Response;
}

async function graphqlJson(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  query: string,
  variables?: Record<string, unknown>,
) {
  const response = await admin.graphql(query, { variables });
  const json = (await response.json()) as Record<string, unknown>;
  const topErrors = (json.errors as Array<Record<string, unknown>> | undefined) || [];
  if (topErrors.length > 0) {
    const message = topErrors
      .map((e) => (typeof e.message === "string" ? e.message : "GraphQL error"))
      .join("; ");
    throw new Error(message);
  }
  return json;
}

function graphqlUserErrors(result: Record<string, unknown>, key: string): string[] {
  const node = (result.data as Record<string, unknown> | undefined)?.[key] as
    | Record<string, unknown>
    | undefined;
  const errors = (node?.userErrors as Array<Record<string, unknown>> | undefined) || [];
  return errors
    .map((e) => e.message)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

function escapeSkuForSearch(sku: string) {
  return sku.replace(/([:\\\\\"])/g, "\\$1");
}

async function upsertShopifyProductBySku(input: {
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> };
  sku: string;
  title?: string;
  description?: string;
  knownVariantId?: string | null;
  knownProductId?: string | null;
}): Promise<ShopifyUpsertResult> {
  if (input.knownVariantId && input.knownProductId) {
    const updateJson = await graphqlJson(
      input.admin,
      `#graphql
        mutation setVariantSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              sku
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        productId: input.knownProductId,
        variants: [{ id: input.knownVariantId, inventoryItem: { sku: input.sku } }],
      },
    );

    const updateErrors = graphqlUserErrors(updateJson, "productVariantsBulkUpdate");
    if (updateErrors.length > 0) {
      return {
        productId: input.knownProductId,
        variantId: input.knownVariantId,
        error: `productVariantsBulkUpdate failed: ${updateErrors.join("; ")}`,
      };
    }

    return {
      productId: input.knownProductId,
      variantId: input.knownVariantId,
      error: null,
    };
  }

  const searchQuery = `sku:${escapeSkuForSearch(input.sku)}`;
  const findJson = await graphqlJson(
    input.admin,
    `#graphql
      query variantBySku($query: String!) {
        productVariants(first: 5, query: $query) {
          edges {
            node {
              id
              sku
              product {
                id
                title
              }
            }
          }
        }
      }`,
    { query: searchQuery },
  );

  const existingEdges = (
    (((findJson.data as Record<string, unknown> | undefined)?.productVariants as Record<
      string,
      unknown
    > | undefined)?.edges as Array<Record<string, unknown>> | undefined) || []
  )
    .map((edge) => edge.node as Record<string, unknown>)
    .filter(Boolean);

  if (existingEdges.length > 1) {
    return {
      productId: null,
      variantId: null,
      error: `Multiple Shopify variants matched SKU ${input.sku}.`,
    };
  }

  const existingNode = existingEdges[0];

  if (existingNode?.id && (existingNode.product as Record<string, unknown> | undefined)?.id) {
    return {
      productId: (existingNode.product as Record<string, unknown>).id as string,
      variantId: existingNode.id as string,
      error: null,
    };
  }

  const title = input.title?.trim() || `eBay ${input.sku}`;
  const descriptionHtml = input.description?.trim() || "";

  const createJson = await graphqlJson(
    input.admin,
    `#graphql
      mutation createProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            variants(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      product: {
        title,
        ...(descriptionHtml ? { descriptionHtml } : {}),
        status: "ACTIVE",
      },
    },
  );

  const createErrors = graphqlUserErrors(createJson, "productCreate");
  if (createErrors.length > 0) {
    return {
      productId: null,
      variantId: null,
      error: `productCreate failed: ${createErrors.join("; ")}`,
    };
  }

  const createdProduct = (createJson.data as Record<string, unknown> | undefined)
    ?.productCreate as Record<string, unknown> | undefined;
  const product = createdProduct?.product as Record<string, unknown> | undefined;
  const productId = (product?.id as string | undefined) || null;
  const createdVariantEdge = (
    ((product?.variants as Record<string, unknown> | undefined)?.edges as Array<
      Record<string, unknown>
    > | undefined) || []
  )[0];
  const variantId = (createdVariantEdge?.node as Record<string, unknown> | undefined)?.id as
    | string
    | undefined;

  if (!productId || !variantId) {
    return {
      productId,
      variantId: variantId || null,
      error: "productCreate succeeded but variant id was not returned.",
    };
  }

  const updateJson = await graphqlJson(
    input.admin,
    `#graphql
      mutation setVariantSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            sku
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      productId,
      variants: [{ id: variantId, inventoryItem: { sku: input.sku } }],
    },
  );

  const updateErrors = graphqlUserErrors(updateJson, "productVariantsBulkUpdate");
  if (updateErrors.length > 0) {
    return {
      productId,
      variantId,
      error: `productVariantsBulkUpdate failed: ${updateErrors.join("; ")}`,
    };
  }

  return {
    productId,
    variantId,
    error: null,
  };
}

function parseNextOffset(next?: string | null): number | null {
  if (!next) return null;
  try {
    const url = new URL(next, "https://api.ebay.com");
    const offset = Number(url.searchParams.get("offset"));
    return Number.isFinite(offset) ? offset : null;
  } catch {
    return null;
  }
}

async function getAccessToken(refreshToken: string, scopes: string) {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET.");
  }

  const scopeString = scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  const res = await fetchWithRetry(
    `${getEbayIdentityBaseUrl()}/identity/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${toBasicAuth(clientId, clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        ...(scopeString ? { scope: scopeString } : {}),
      }),
    },
    3,
  );

  const json = (await res.json()) as EbayTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(
      `eBay token exchange failed (${res.status}): ${json.error || "unknown_error"} ${json.error_description || ""}`,
    );
  }

  return json.access_token;
}

async function fetchInventoryPage(input: {
  accessToken: string;
  limit: number;
  offset: number;
}) {
  const url = new URL(`${getEbayApiBaseUrl()}/sell/inventory/v1/inventory_item`);
  url.searchParams.set("limit", String(input.limit));
  url.searchParams.set("offset", String(input.offset));

  const response = await fetchWithRetry(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Accept-Language": process.env.EBAY_ACCEPT_LANGUAGE || "en-US",
      },
    },
    3,
  );

  const text = await response.text();
  let json: EbayInventoryPage | Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as EbayInventoryPage;
  } catch {
    throw new Error(`eBay inventory response parse failed (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(`eBay inventory fetch failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return json as EbayInventoryPage;
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
      limit: Number(form.get("limit") || 50),
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

  return db.ebayAccount.findFirst({
    where: { storeId, status: "connected" },
    orderBy: { id: "asc" },
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
    totalItems: 0,
    processedItems: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    conflictCount: 0,
    missingCount: 0,
    errorCount: 0,
  };

  let inputItems: SyncInputItem[] = Array.isArray(body.items) ? body.items : [];
  let source: "manual" | "ebay_api" = "manual";
  let nextOffset: number | null = null;

  try {
    if (inputItems.length === 0) {
      source = "ebay_api";
      const checkpoint = await db.syncCheckpoint.findUnique({
        where: { ebayAccountId: ebayAccount.id },
        select: { cursor: true },
      });

      const fallbackScopes =
        process.env.EBAY_OAUTH_SCOPES ||
        "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly";
      const accessToken = await getAccessToken(
        ebayAccount.refreshTokenEnc,
        ebayAccount.scopes || fallbackScopes,
      );

      const requestedLimit = Number.isFinite(body.limit) ? Number(body.limit) : 50;
      const limit = Math.max(1, Math.min(200, requestedLimit || 50));
      const initialOffset = body.cursor ?? checkpoint?.cursor;
      const offset = Number.isFinite(Number(initialOffset)) ? Number(initialOffset) : 0;

      const page = await fetchInventoryPage({ accessToken, limit, offset });
      const fetchedItems = Array.isArray(page.inventoryItems) ? page.inventoryItems : [];
      inputItems = fetchedItems.map((it) => ({
        sku: it.sku,
        itemId: undefined,
        variationKey: undefined,
        lastModified: undefined,
        title: it.product?.title,
        description: it.product?.description,
        quantity: it.availability?.shipToLocationAvailability?.quantity,
        imageUrls: it.product?.imageUrls || [],
      }));
      nextOffset = parseNextOffset(page.next || null);
      counters.totalItems = inputItems.length;
    }
  } catch (error) {
    counters.errorCount += 1;
    await db.syncError.create({
      data: {
        runId: run.id,
        storeId: store.id,
        ebayAccountId: ebayAccount.id,
        errorCode: "EBAY_FETCH_ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown eBay fetch error.",
      },
    });
  }

  counters.totalItems = Math.max(counters.totalItems, inputItems.length);

  for (const item of inputItems) {
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
      const accountIds = [existing.ebayAccountId, ebayAccount.id].sort((a, b) => a - b);
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

    const shouldSkipByTimestamp =
      Boolean(existing) &&
      Boolean(existing?.ebayLastModified) &&
      Boolean(incomingModified) &&
      incomingModified!.getTime() <= existing!.ebayLastModified!.getTime();

    // Skip only when we already have Shopify mapping for this SKU.
    // If mapping is missing, force Shopify upsert even when eBay data itself is unchanged.
    const hasShopifyMapping =
      Boolean(existing?.shopifyProductId) && Boolean(existing?.shopifyVariantId);
    const shouldSkip = shouldSkipByTimestamp && hasShopifyMapping;

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

    let shopifyProductId: string | null = null;
    let shopifyVariantId: string | null = null;

    try {
      const { admin } = await unauthenticated.admin(store.shop);
      const upsertResult = await upsertShopifyProductBySku({
        admin,
        sku,
        title: item.title,
        description: item.description,
        knownVariantId: existing?.shopifyVariantId ?? null,
        knownProductId: existing?.shopifyProductId ?? null,
      });

      if (upsertResult.error) {
        counters.errorCount += 1;
        await db.syncError.create({
          data: {
            runId: run.id,
            storeId: store.id,
            ebayAccountId: ebayAccount.id,
            sku,
            ebayItemId,
            errorCode: "SHOPIFY_UPSERT_ERROR",
            errorMessage: upsertResult.error,
          },
        });
        continue;
      }

      shopifyProductId = upsertResult.productId;
      shopifyVariantId = upsertResult.variantId;
    } catch (error) {
      counters.errorCount += 1;
      await db.syncError.create({
        data: {
          runId: run.id,
          storeId: store.id,
          ebayAccountId: ebayAccount.id,
          sku,
          ebayItemId,
          errorCode: "SHOPIFY_UPSERT_ERROR",
          errorMessage:
            error instanceof Error ? error.message : "Failed to upsert Shopify product.",
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
        shopifyProductId,
        shopifyVariantId,
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
        shopifyProductId,
        shopifyVariantId,
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

  const fullScanComplete =
    typeof body.fullScanComplete === "boolean" ? body.fullScanComplete : source === "ebay_api" && nextOffset === null;

  if (fullScanComplete) {
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

  const checkpointCursor =
    source === "ebay_api"
      ? nextOffset !== null
        ? String(nextOffset)
        : null
      : body.nextCursor ?? body.cursor ?? null;

  await db.syncCheckpoint.upsert({
    where: { ebayAccountId: ebayAccount.id },
    create: {
      ebayAccountId: ebayAccount.id,
      cursor: checkpointCursor,
      mode,
      lastError: counters.errorCount > 0 ? "Run completed with errors." : null,
    },
    update: {
      cursor: checkpointCursor,
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
        inputItems.length === 0
          ? "No items processed."
          : source === "ebay_api"
            ? "Sync core processing finished (source: eBay API)."
            : "Sync core processing finished (source: manual items).",
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
      source,
      checkpointCursor,
      fullScanComplete,
      counters,
      note:
        source === "ebay_api"
          ? "Phase-3 core sync executed with eBay Inventory API page fetch."
          : "Phase-3 core sync executed for provided input items.",
    },
    { status: 200 },
  );
};
