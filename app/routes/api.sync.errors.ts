import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || 50);
  const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));

  const store = await db.store.findUnique({
    where: { shop },
    select: { id: true },
  });

  if (!store) {
    return Response.json({ shop, errors: [], latestRunId: null });
  }

  const latestRun = await db.syncRun.findFirst({
    where: { storeId: store.id },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (!latestRun) {
    return Response.json({ shop, errors: [], latestRunId: null });
  }

  const errors = await db.syncError.findMany({
    where: { storeId: store.id, runId: latestRun.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      runId: true,
      ebayAccountId: true,
      sku: true,
      ebayItemId: true,
      errorCode: true,
      errorMessage: true,
      payload: true,
      createdAt: true,
    },
  });

  return Response.json({
    shop,
    latestRunId: latestRun.id,
    count: errors.length,
    errors,
  });
};
