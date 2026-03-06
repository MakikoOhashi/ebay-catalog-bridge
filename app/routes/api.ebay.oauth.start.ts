import { createHmac, randomUUID } from "node:crypto";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

type OAuthStatePayload = {
  shop: string;
  nonce: string;
  ts: number;
  accountId?: number;
  label?: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signState(payloadB64: string) {
  const secret =
    process.env.EBAY_OAUTH_STATE_SECRET || process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    throw new Error("Missing EBAY_OAUTH_STATE_SECRET/SHOPIFY_API_SECRET.");
  }
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function getAuthBaseUrl() {
  return process.env.EBAY_ENV === "sandbox"
    ? "https://auth.sandbox.ebay.com/oauth2/authorize"
    : "https://auth.ebay.com/oauth2/authorize";
}

function isValidShop(value: string | null) {
  if (!value) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(value);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop: string | null = null;
  try {
    const { session } = await authenticate.admin(request);
    shop = session.shop;
  } catch {
    const requestedShop = url.searchParams.get("shop");
    if (isValidShop(requestedShop)) {
      shop = requestedShop;
    }
  }

  if (!shop) {
    return Response.json(
      {
        error: "shop_required",
        detail:
          "Open this route from /app/sync or provide ?shop={your-shop}.myshopify.com",
      },
      { status: 400 },
    );
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const redirectUri = process.env.EBAY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json(
      {
        error: "missing_ebay_oauth_config",
        required: ["EBAY_CLIENT_ID", "EBAY_REDIRECT_URI"],
      },
      { status: 500 },
    );
  }

  const requestedAccountId = url.searchParams.get("accountId");
  const requestedLabel = url.searchParams.get("label") || "primary";
  const scopes = (
    process.env.EBAY_OAUTH_SCOPES ||
    "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly"
  ).trim();

  const payload: OAuthStatePayload = {
    shop,
    nonce: randomUUID(),
    ts: Date.now(),
    label: requestedLabel,
    ...(requestedAccountId ? { accountId: Number(requestedAccountId) } : {}),
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signState(payloadB64);
  const state = `${payloadB64}.${signature}`;

  const authUrl = new URL(getAuthBaseUrl());
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  throw redirect(authUrl.toString());
};
