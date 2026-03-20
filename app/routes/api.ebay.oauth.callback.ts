import { createHmac } from "node:crypto";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import db from "../db.server";

type OAuthStatePayload = {
  shop: string;
  nonce: string;
  ts: number;
  accountId?: number;
  label?: string;
};

type EbayTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function getTradingApiUrl() {
  return process.env.EBAY_ENV === "sandbox"
    ? "https://api.sandbox.ebay.com/ws/api.dll"
    : "https://api.ebay.com/ws/api.dll";
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1].trim()) : null;
}

async function fetchEbayUserId(accessToken: string): Promise<string | null> {
  const response = await fetch(getTradingApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-EBAY-API-CALL-NAME": "GetUser",
      "X-EBAY-API-COMPATIBILITY-LEVEL": "1231",
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-IAF-TOKEN": accessToken,
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<GetUserRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <DetailLevel>ReturnAll</DetailLevel>
</GetUserRequest>`,
  });

  const text = await response.text();
  if (!response.ok) return null;

  const ack = extractTagValue(text, "Ack");
  if (ack && ack !== "Success" && ack !== "Warning") return null;

  return extractTagValue(text, "UserID") || null;
}

function verifyState(state: string): OAuthStatePayload | null {
  const secret =
    process.env.EBAY_OAUTH_STATE_SECRET || process.env.SHOPIFY_API_SECRET;
  if (!secret) return null;

  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
    return payload;
  } catch {
    return null;
  }
}

function getTokenUrl() {
  return process.env.EBAY_ENV === "sandbox"
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";
}

function basicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function isStateExpired(payload: OAuthStatePayload) {
  const tenMinutesMs = 10 * 60 * 1000;
  return Date.now() - payload.ts > tenMinutesMs;
}

function normalizeScopes(scope?: string) {
  if (!scope) return "";
  return scope
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const callbackUrl = new URL(request.url);
  const code = callbackUrl.searchParams.get("code");
  const state = callbackUrl.searchParams.get("state");

  if (!code || !state) {
    return Response.json(
      { error: "missing_code_or_state", details: callbackUrl.searchParams },
      { status: 400 },
    );
  }

  const parsedState = verifyState(state);
  if (!parsedState || isStateExpired(parsedState)) {
    return Response.json({ error: "invalid_or_expired_state" }, { status: 400 });
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return Response.json(
      {
        error: "missing_ebay_oauth_config",
        required: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_REDIRECT_URI"],
      },
      { status: 500 },
    );
  }

  const tokenResponse = await fetch(getTokenUrl(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenResponse.json()) as EbayTokenResponse;
  if (!tokenResponse.ok || !tokenJson.refresh_token) {
    return Response.json(
      {
        error: "token_exchange_failed",
        status: tokenResponse.status,
        ebayError: tokenJson.error,
        ebayDescription: tokenJson.error_description,
      },
      { status: 400 },
    );
  }

  const ebayUserId = tokenJson.access_token
    ? await fetchEbayUserId(tokenJson.access_token)
    : null;

  const store = await db.store.upsert({
    where: { shop: parsedState.shop },
    create: { shop: parsedState.shop },
    update: {},
  });

  if (parsedState.accountId) {
    const target = await db.ebayAccount.findFirst({
      where: { id: parsedState.accountId, storeId: store.id },
      select: { id: true },
    });

    if (target) {
      await db.ebayAccount.update({
        where: { id: target.id },
        data: {
          ebayUserId,
          refreshTokenEnc: tokenJson.refresh_token,
          scopes: normalizeScopes(tokenJson.scope),
          status: "connected",
        },
      });
      throw redirect(
        `/oauth/ebay/done?status=connected&shop=${encodeURIComponent(parsedState.shop)}&account_id=${target.id}`,
      );
    }
  }

  const label = parsedState.label?.trim() || "primary";
  const upserted = await db.ebayAccount.upsert({
    where: {
      storeId_label: {
        storeId: store.id,
        label,
      },
    },
    create: {
      storeId: store.id,
      label,
      ebayUserId,
      refreshTokenEnc: tokenJson.refresh_token,
      scopes: normalizeScopes(tokenJson.scope),
      status: "connected",
    },
    update: {
      ebayUserId,
      refreshTokenEnc: tokenJson.refresh_token,
      scopes: normalizeScopes(tokenJson.scope),
      status: "connected",
    },
  });

  throw redirect(
    `/oauth/ebay/done?status=connected&shop=${encodeURIComponent(parsedState.shop)}&account_id=${upserted.id}`,
  );
};
