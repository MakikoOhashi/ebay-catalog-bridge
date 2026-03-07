import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { action as enqueueSyncAction } from "./jobs.enqueue-sync";

type EnqueueAllBody = {
  mode?: "rolling" | "full";
  ebayAccountId?: number;
  limit?: number;
  cursor?: string | null;
  nextCursor?: string | null;
  fullScanComplete?: boolean;
};

function unauthorizedResponse() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
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

async function parseBody(request: Request): Promise<EnqueueAllBody> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return (await request.json()) as EnqueueAllBody;
  } catch {
    return {};
  }
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

  const body = await parseBody(request);
  const connectedStores = await db.store.findMany({
    where: { ebayAccounts: { some: { status: "connected" } } },
    select: { id: true, shop: true },
    orderBy: { id: "asc" },
  });

  if (connectedStores.length === 0) {
    return Response.json({
      accepted: true,
      totalStores: 0,
      acceptedStores: 0,
      failedStores: 0,
      results: [],
      note: "No connected stores found.",
    });
  }

  const results: Array<{
    storeId: number;
    shop: string;
    accepted: boolean;
    status: number;
    result: unknown;
  }> = [];

  const sharedSecret = process.env.CRON_SHARED_SECRET?.trim();
  const targetUrl = new URL("/jobs/enqueue-sync", request.url).toString();

  for (const store of connectedStores) {
    const headers = new Headers({ "content-type": "application/json" });
    if (sharedSecret) headers.set("x-cron-secret", sharedSecret);

    const internalRequest = new Request(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        shop: store.shop,
      }),
    });

    const response = await enqueueSyncAction({
      request: internalRequest,
      context: {},
      params: {},
    } as ActionFunctionArgs);

    let json: unknown = null;
    try {
      json = await response.clone().json();
    } catch {
      json = { error: "non_json_response" };
    }

    results.push({
      storeId: store.id,
      shop: store.shop,
      accepted:
        response.ok &&
        typeof json === "object" &&
        json !== null &&
        "accepted" in json
          ? Boolean((json as { accepted?: boolean }).accepted)
          : false,
      status: response.status,
      result: json,
    });
  }

  const acceptedStores = results.filter((item) => item.accepted).length;
  const failedStores = results.length - acceptedStores;

  return Response.json({
    accepted: failedStores === 0,
    totalStores: results.length,
    acceptedStores,
    failedStores,
    results,
  });
};
