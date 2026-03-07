import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { action as enqueueSyncAction } from "./jobs.enqueue-sync";

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

  const sharedSecret = process.env.CRON_SHARED_SECRET?.trim();
  const headers = new Headers({ "content-type": "application/json" });
  if (sharedSecret) {
    headers.set("x-cron-secret", sharedSecret);
  }

  const internalRequest = new Request(new URL("/jobs/enqueue-sync", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify({
      shop: session.shop,
      mode: latest.mode || "rolling",
      ebayAccountId: latest.ebayAccountId,
    }),
  });

  const response = await enqueueSyncAction({
    request: internalRequest,
    context: {},
    params: {},
  } as ActionFunctionArgs);

  let result: unknown = null;
  try {
    result = await response.clone().json();
  } catch {
    result = { error: "non_json_response" };
  }

  return Response.json(
    {
      enqueued: response.ok,
      status: response.status,
      retryTarget: {
        shop: session.shop,
        ebayAccountId: latest.ebayAccountId,
        mode: latest.mode || "rolling",
      },
      result,
    },
    { status: response.ok ? 200 : 400 },
  );
};
