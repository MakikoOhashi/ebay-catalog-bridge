import { CheckpointMode, RunStatus } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";

type EnqueueBody = {
  shop?: string;
  ebayAccountId?: number;
  mode?: "rolling" | "full";
};

function unauthorizedResponse() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function parseMode(rawMode?: string): CheckpointMode {
  return rawMode === "full" ? CheckpointMode.full : CheckpointMode.rolling;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const sharedSecret = process.env.CRON_SHARED_SECRET?.trim();
  if (sharedSecret) {
    const token = request.headers.get("x-cron-secret")?.trim();
    if (token !== sharedSecret) {
      try {
        await authenticate.admin(request);
      } catch {
        return unauthorizedResponse();
      }
    }
  }

  let body: EnqueueBody = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as EnqueueBody;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      const ebayAccountIdRaw = form.get("ebayAccountId");
      const parsedAccountId =
        typeof ebayAccountIdRaw === "string" && ebayAccountIdRaw.length > 0
          ? Number(ebayAccountIdRaw)
          : undefined;

      body = {
        shop: form.get("shop")?.toString() || undefined,
        mode: (form.get("mode")?.toString() as "rolling" | "full") || undefined,
        ebayAccountId:
          parsedAccountId !== undefined && Number.isFinite(parsedAccountId)
            ? parsedAccountId
            : undefined,
      };
    }
  } catch {
    // Allow empty or non-JSON body to keep endpoint lightweight for simple pings.
  }

  const shop = body.shop ?? "unknown-shop.local";
  const mode = parseMode(body.mode);

  const store = await db.store.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });

  const run = await db.syncRun.create({
    data: {
      storeId: store.id,
      ebayAccountId: body.ebayAccountId ?? null,
      mode,
      status: RunStatus.running,
      message: "Enqueued (stub): execution not implemented yet.",
    },
  });

  await db.syncRun.update({
    where: { id: run.id },
    data: {
      status: RunStatus.succeeded,
      endedAt: new Date(),
      message: "Stub run completed successfully.",
    },
  });

  return Response.json(
    {
      accepted: true,
      jobId: run.id,
      mode,
      storeId: store.id,
      shop,
      note: "This is a phase-2 stub. Full sync worker is not implemented yet.",
    },
    { status: 200 },
  );
};
