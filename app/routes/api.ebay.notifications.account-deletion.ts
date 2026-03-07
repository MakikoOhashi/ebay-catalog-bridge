import { createHash } from "node:crypto";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

const ENDPOINT_PATH = "/api/ebay/notifications/account-deletion";

function normalizeEndpoint(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveEndpoint(requestUrl: string) {
  const envEndpoint = process.env.EBAY_ACCOUNT_DELETION_ENDPOINT?.trim();
  if (envEndpoint) return normalizeEndpoint(envEndpoint);

  const appUrl = process.env.SHOPIFY_APP_URL?.trim();
  if (appUrl) {
    return normalizeEndpoint(new URL(ENDPOINT_PATH, appUrl).toString());
  }

  const parsed = new URL(requestUrl);
  return normalizeEndpoint(`${parsed.origin}${parsed.pathname}`);
}

function validateToken(token: string) {
  return /^[A-Za-z0-9_-]{32,80}$/.test(token);
}

function buildChallengeResponse(
  challengeCode: string,
  verificationToken: string,
  endpoint: string,
) {
  const hash = createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpoint);
  return hash.digest("hex");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const challengeCode = url.searchParams.get("challenge_code");

  if (!challengeCode) {
    return Response.json(
      { error: "missing_challenge_code" },
      { status: 400 },
    );
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN?.trim();
  if (!verificationToken) {
    return Response.json(
      { error: "missing_ebay_verification_token" },
      { status: 500 },
    );
  }

  if (!validateToken(verificationToken)) {
    return Response.json(
      {
        error: "invalid_ebay_verification_token",
        detail:
          "EBAY_VERIFICATION_TOKEN must be 32-80 chars using A-Z a-z 0-9 _ -",
      },
      { status: 500 },
    );
  }

  const endpoint = resolveEndpoint(request.url);
  const challengeResponse = buildChallengeResponse(
    challengeCode,
    verificationToken,
    endpoint,
  );

  return Response.json({ challengeResponse }, { status: 200 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    // eBay can still treat 200 as accepted even if body is empty/invalid.
  }

  console.log("[ebay-account-deletion] notification received", {
    hasPayload: payload !== null,
  });

  return new Response(null, { status: 200 });
};
