import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const store = await db.store.findUnique({
    where: { shop },
    select: {
      id: true,
      shop: true,
      syncRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
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
      },
      ebayAccounts: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          label: true,
          status: true,
          checkpoint: {
            select: {
              cursor: true,
              mode: true,
              updatedAt: true,
              lastError: true,
            },
          },
        },
      },
    },
  });

  if (!store) {
    return Response.json({
      shop,
      storeId: null,
      latestRun: null,
      checkpoints: [],
    });
  }

  return Response.json({
    shop: store.shop,
    storeId: store.id,
    latestRun: store.syncRuns[0] ?? null,
    checkpoints: store.ebayAccounts.map((account) => ({
      ebayAccountId: account.id,
      label: account.label,
      status: account.status,
      checkpoint: account.checkpoint ?? null,
    })),
  });
};
