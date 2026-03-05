import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const store = await db.store.findUnique({
    where: { shop: session.shop },
    select: { id: true },
  });
  if (!store) return Response.json({ error: "store_not_found" }, { status: 404 });

  const latest = await db.syncRun.findFirst({
    where: { storeId: store.id },
    orderBy: { startedAt: "desc" },
    select: { ebayAccountId: true, mode: true },
  });

  if (!latest?.ebayAccountId) {
    return Response.json(
      { enqueued: false, error: "no_retry_target", detail: "No previous account-bound run." },
      { status: 400 },
    );
  }

  const run = await db.syncRun.create({
    data: {
      storeId: store.id,
      ebayAccountId: latest.ebayAccountId,
      mode: latest.mode || "rolling",
      status: "succeeded",
      startedAt: new Date(),
      endedAt: new Date(),
      message: "Manual retry requested (placeholder).",
    },
  });

  return Response.json({ enqueued: true, runId: run.id });
};
