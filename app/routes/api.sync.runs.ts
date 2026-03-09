import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || 20);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 20));

  const store = await db.store.findUnique({
    where: { shop },
    select: { id: true },
  });

  if (!store) {
    return Response.json({ shop, count: 0, runs: [] });
  }

  const runs = await db.syncRun.findMany({
    where: { storeId: store.id },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      mode: true,
      status: true,
      startedAt: true,
      endedAt: true,
      totalItems: true,
      processedItems: true,
      createdCount: true,
      updatedCount: true,
      skippedCount: true,
      conflictCount: true,
      missingCount: true,
      errorCount: true,
      message: true,
      ebayAccountId: true,
    },
  });

  return Response.json({
    shop,
    count: runs.length,
    runs,
  });
};
