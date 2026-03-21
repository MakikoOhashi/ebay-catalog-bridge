import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type EbayTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

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

  const response = await fetch(`${getEbayIdentityBaseUrl()}/identity/v1/oauth2/token`, {
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
  });

  const json = (await response.json()) as EbayTokenResponse;
  if (!response.ok || !json.access_token) {
    throw new Error(
      `eBay token exchange failed (${response.status}): ${json.error || "unknown_error"} ${json.error_description || ""}`,
    );
  }

  return json.access_token;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const sku = url.searchParams.get("sku")?.trim() || "";
  const accountIdRaw = url.searchParams.get("accountId")?.trim() || "";
  const accountId = Number(accountIdRaw);

  if (!sku) {
    return Response.json({ error: "sku_required" }, { status: 400 });
  }

  if (!Number.isFinite(accountId)) {
    return Response.json({ error: "account_id_required" }, { status: 400 });
  }

  const store = await db.store.findUnique({
    where: { shop },
    select: { id: true, shop: true },
  });

  if (!store) {
    return Response.json({ error: "store_not_found", shop }, { status: 404 });
  }

  const ebayAccount = await db.ebayAccount.findFirst({
    where: {
      id: accountId,
      storeId: store.id,
      status: "connected",
    },
    select: {
      id: true,
      label: true,
      ebayUserId: true,
      refreshTokenEnc: true,
      scopes: true,
    },
  });

  if (!ebayAccount) {
    return Response.json({ error: "ebay_account_not_found", accountId }, { status: 404 });
  }

  const fallbackScopes =
    process.env.EBAY_OAUTH_SCOPES ||
    "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly";

  try {
    const accessToken = await getAccessToken(
      ebayAccount.refreshTokenEnc,
      ebayAccount.scopes || fallbackScopes,
    );

    const ebayResponse = await fetch(
      `${getEbayApiBaseUrl()}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Accept-Language": process.env.EBAY_ACCEPT_LANGUAGE || "en-US",
          "Content-Type": "application/json",
        },
      },
    );

    const rawText = await ebayResponse.text();
    let ebayJson: unknown = null;
    try {
      ebayJson = JSON.parse(rawText);
    } catch {
      ebayJson = rawText;
    }

    const skuLink = await db.skuLink.findUnique({
      where: { storeId_sku: { storeId: store.id, sku } },
      select: {
        id: true,
        sku: true,
        ebayItemId: true,
        ebayLastModified: true,
        shopifyProductId: true,
        shopifyVariantId: true,
        syncStatus: true,
        lastSyncAt: true,
        lastError: true,
      },
    });

    return Response.json({
      shop,
      account: {
        id: ebayAccount.id,
        label: ebayAccount.label,
        ebayUserId: ebayAccount.ebayUserId,
      },
      sku,
      ebayStatus: ebayResponse.status,
      ebayOk: ebayResponse.ok,
      weightPreview:
        typeof ebayJson === "object" && ebayJson
          ? {
              packageWeightAndSize: (ebayJson as Record<string, unknown>).packageWeightAndSize ?? null,
            }
          : null,
      ebayItem: ebayJson,
      skuLink,
    });
  } catch (error) {
    return Response.json(
      {
        error: "debug_fetch_failed",
        message: error instanceof Error ? error.message : "Unknown error.",
        shop,
        accountId,
        sku,
      },
      { status: 500 },
    );
  }
};
