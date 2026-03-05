import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

async function getStoreId(shop: string) {
  const store = await db.store.findUnique({ where: { shop }, select: { id: true } });
  return store?.id ?? null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const storeId = await getStoreId(session.shop);

  if (!storeId) return Response.json({ conflicts: [] });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "open";
  const conflicts = await db.skuConflict.findMany({
    where: {
      storeId,
      ...(status === "all" ? {} : { status: status === "resolved" ? "resolved" : "open" }),
    },
    orderBy: [{ lastDetectedAt: "desc" }],
    take: 200,
  });

  return Response.json({ conflicts });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const storeId = await getStoreId(session.shop);
  if (!storeId) return Response.json({ error: "store_not_found" }, { status: 404 });

  let conflictId: number | null = null;
  let note = "";
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { conflictId?: number; note?: string };
      conflictId = typeof body.conflictId === "number" ? body.conflictId : null;
      note = body.note || "";
    } else {
      const form = await request.formData();
      conflictId = Number(form.get("conflictId"));
      note = form.get("note")?.toString() || "";
    }
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!conflictId || Number.isNaN(conflictId)) {
    return Response.json({ error: "conflict_id_required" }, { status: 400 });
  }

  const updated = await db.skuConflict.updateMany({
    where: { id: conflictId, storeId },
    data: {
      status: "resolved",
      note: note.trim() || null,
      lastDetectedAt: new Date(),
    },
  });

  return Response.json({ resolved: updated.count > 0, conflictId });
};
