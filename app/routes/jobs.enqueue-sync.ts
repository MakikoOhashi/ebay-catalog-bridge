import type { CheckpointMode, RunStatus } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { unauthenticated } from "../shopify.server";

type SyncInputItem = {
  sku?: string;
  itemId?: string;
  variationKey?: string;
  lastModified?: string;
  title?: string;
  description?: string;
  quantity?: number;
  price?: number;
  imageUrls?: string[];
  weightValue?: number;
  weightUnit?: string;
};

type EnqueueBody = {
  shop?: string;
  ebayAccountId?: number;
  mode?: "rolling" | "full";
  cursor?: string | null;
  nextCursor?: string | null;
  fullScanComplete?: boolean;
  limit?: number;
  items?: SyncInputItem[];
};

type EbayInventoryItem = {
  sku?: string;
  packageWeightAndSize?: {
    weight?: {
      value?: number;
      unit?: string;
    };
  };
  product?: {
    title?: string;
    description?: string;
    imageUrls?: string[];
  };
  price?: {
    value?: string;
  };
  availability?: {
    shipToLocationAvailability?: {
      quantity?: number;
    };
  };
};

type EbayInventoryPage = {
  inventoryItems?: EbayInventoryItem[];
  next?: string;
  total?: number;
  limit?: number;
};

type EbayTradingItem = {
  sku?: string;
  itemId?: string;
  title?: string;
  description?: string;
  quantity?: number;
  price?: number;
  lastModified?: string;
  imageUrls?: string[];
  variationKey?: string;
  weightValue?: number;
  weightUnit?: string;
};

type EbayTradingPage = {
  items: EbayTradingItem[];
  hasMore: boolean;
  ack: string | null;
  errors: string[];
};

type EbayTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type RunCounters = {
  totalItems: number;
  processedItems: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  conflictCount: number;
  missingCount: number;
  errorCount: number;
};

type ShopifyUpsertResult = {
  productId: string | null;
  variantId: string | null;
  inventoryItemId: string | null;
  error: string | null;
};

type ShopifyAdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

type ShopifyInventoryRef = {
  inventoryItemId: string | null;
  tracked: boolean | null;
};

function unauthorizedResponse() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function parseMode(rawMode?: string): CheckpointMode {
  return rawMode === "full" ? "full" : "rolling";
}

function parseLastModified(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildFinalRunStatus(counters: RunCounters): RunStatus {
  if (counters.errorCount === 0 && counters.conflictCount === 0) {
    return "succeeded";
  }
  if (counters.processedItems > 0) {
    return "partial";
  }
  return "failed";
}

async function notifyRunIssue(input: {
  shop: string;
  runId: number;
  status: RunStatus;
  errorNotifyEmail?: string | null;
  slackNotifyWebhookUrl?: string | null;
  counters: RunCounters;
}) {
  if (input.status === "succeeded") return;

  const payload = {
    type: "sync_run_issue",
    shop: input.shop,
    runId: input.runId,
    status: input.status,
    notifyEmail: input.errorNotifyEmail ?? null,
    notifySlackWebhookConfigured: Boolean(input.slackNotifyWebhookUrl?.trim()),
    counters: input.counters,
    createdAt: new Date().toISOString(),
  };

  console.warn("[sync-notify]", JSON.stringify(payload));

  const webhook =
    input.slackNotifyWebhookUrl?.trim() || process.env.ERROR_NOTIFY_WEBHOOK_URL?.trim();
  if (!webhook) return;

  const text = [
    `:warning: ebay-catalog-bridge sync issue`,
    `shop=${input.shop}`,
    `runId=${input.runId}`,
    `status=${input.status}`,
    `errors=${input.counters.errorCount}`,
    `processed=${input.counters.processedItems}/${input.counters.totalItems}`,
    `conflicts=${input.counters.conflictCount}`,
    `missing=${input.counters.missingCount}`,
  ].join(" | ");

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Sync issue detected*\n• shop: \`${input.shop}\`\n• runId: \`${input.runId}\`\n• status: \`${input.status}\`\n• errors: \`${input.counters.errorCount}\`\n• processed: \`${input.counters.processedItems}/${input.counters.totalItems}\`\n• conflicts: \`${input.counters.conflictCount}\`\n• missing: \`${input.counters.missingCount}\``,
            },
          },
        ],
        metadata: payload,
      }),
    });
  } catch (error) {
    console.error("[sync-notify] webhook failed", error);
  }
}

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(input, init);
    if (response.status !== 429 && (response.status < 500 || response.status > 599)) {
      return response;
    }
    lastResponse = response;
    if (i < attempts - 1) {
      await sleep(300 * 2 ** i);
    }
  }

  return lastResponse as Response;
}

async function graphqlJson(
  admin: ShopifyAdminClient,
  query: string,
  variables?: Record<string, unknown>,
) {
  const response = await admin.graphql(query, { variables });
  const json = (await response.json()) as Record<string, unknown>;
  const topErrors = (json.errors as Array<Record<string, unknown>> | undefined) || [];
  if (topErrors.length > 0) {
    const message = topErrors
      .map((e) => (typeof e.message === "string" ? e.message : "GraphQL error"))
      .join("; ");
    throw new Error(message);
  }
  return json;
}

function graphqlUserErrors(result: Record<string, unknown>, key: string): string[] {
  const node = (result.data as Record<string, unknown> | undefined)?.[key] as
    | Record<string, unknown>
    | undefined;
  const errors = (node?.userErrors as Array<Record<string, unknown>> | undefined) || [];
  return errors
    .map((e) => e.message)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

function escapeSkuForSearch(sku: string) {
  return sku.replace(/([:\\\\\"])/g, "\\$1");
}

function normalizePrice(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value.toFixed(2);
}

function normalizeWeightValue(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function mapEbayWeightUnitToShopify(unit?: string | null) {
  const normalized = unit?.trim().toUpperCase();
  if (normalized === "GRAM" || normalized === "GRAMS") return "GRAMS";
  if (normalized === "KILOGRAM" || normalized === "KILOGRAMS") return "KILOGRAMS";
  if (normalized === "KG" || normalized === "KGS") return "KILOGRAMS";
  if (normalized === "OUNCE" || normalized === "OUNCES") return "OUNCES";
  if (normalized === "OZ" || normalized === "OZS") return "OUNCES";
  if (normalized === "POUND" || normalized === "POUNDS") return "POUNDS";
  if (normalized === "LB" || normalized === "LBS") return "POUNDS";
  return null;
}

function applyRoundRule(value: number, roundRule?: string | null) {
  const normalizedRule = roundRule?.trim().toLowerCase() || "nearest";
  if (normalizedRule === "up" || normalizedRule === "ceil" || normalizedRule === "ceiling") {
    return Math.ceil(value);
  }
  if (normalizedRule === "down" || normalizedRule === "floor") {
    return Math.floor(value);
  }
  return Math.round(value);
}

function convertEbayPriceToShopify(input: {
  price?: number | null;
  fixedFxRate?: number | null;
  priceAdjustmentPercent?: number | null;
  priceAdjustmentFixed?: number | null;
  roundRule?: string | null;
}) {
  if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0) {
    return null;
  }

  const fxRate =
    typeof input.fixedFxRate === "number" && Number.isFinite(input.fixedFxRate) && input.fixedFxRate > 0
      ? input.fixedFxRate
      : 1;

  const percentMultiplier =
    typeof input.priceAdjustmentPercent === "number" && Number.isFinite(input.priceAdjustmentPercent)
      ? 1 + input.priceAdjustmentPercent / 100
      : 1;
  const fixedAdjustment =
    typeof input.priceAdjustmentFixed === "number" && Number.isFinite(input.priceAdjustmentFixed)
      ? input.priceAdjustmentFixed
      : 0;

  const converted = input.price * fxRate;
  const adjusted = converted * percentMultiplier + fixedAdjustment;
  const rounded = applyRoundRule(adjusted, input.roundRule);
  return rounded >= 0 ? rounded : null;
}

function normalizeTagPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildEbayAccountTag(input: {
  ebayUserId?: string | null;
  fallbackLabel?: string | null;
}) {
  const raw = input.ebayUserId?.trim() || input.fallbackLabel?.trim() || "unknown";
  return `ebay-account:${normalizeTagPart(raw)}`;
}

function mergeAccountTag(existingTags: string[] | null | undefined, accountTag?: string | null) {
  const tags = (existingTags || []).filter(
    (tag) => tag.trim() && !tag.trim().startsWith("ebay-account:"),
  );
  if (accountTag?.trim()) {
    tags.push(accountTag.trim());
  }
  return tags;
}

async function upsertShopifyProductBySku(input: {
  admin: ShopifyAdminClient;
  sku: string;
  title?: string;
  description?: string;
  price?: number | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  accountTag?: string | null;
  knownVariantId?: string | null;
  knownProductId?: string | null;
}): Promise<ShopifyUpsertResult> {
  const title = input.title?.trim() || `eBay ${input.sku}`;
  const descriptionHtml = input.description?.trim() || "";
  const normalizedWeightValue = normalizeWeightValue(input.weightValue);
  const normalizedWeightUnit = mapEbayWeightUnitToShopify(input.weightUnit);
  const inventoryItemPayload =
    normalizedWeightValue != null && normalizedWeightUnit
      ? {
          sku: input.sku,
          measurement: {
            weight: {
              value: normalizedWeightValue,
              unit: normalizedWeightUnit,
            },
          },
        }
      : { sku: input.sku };

  if (input.knownVariantId && input.knownProductId) {
    const productJson = await graphqlJson(
      input.admin,
      `#graphql
        query productTags($id: ID!) {
          product(id: $id) {
            id
            tags
          }
        }`,
      { id: input.knownProductId },
    );
    const existingTags =
      (((productJson.data as Record<string, unknown> | undefined)?.product as Record<
        string,
        unknown
      > | undefined)?.tags as string[] | undefined) || [];
    const tags = mergeAccountTag(existingTags, input.accountTag);

    const normalizedPrice = normalizePrice(input.price);
    const updateJson = await graphqlJson(
      input.admin,
      `#graphql
        mutation setVariantSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              sku
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        productId: input.knownProductId,
        variants: [
          {
            id: input.knownVariantId,
            inventoryItem: inventoryItemPayload,
            ...(normalizedPrice ? { price: normalizedPrice } : {}),
          },
        ],
      },
    );

    const updateErrors = graphqlUserErrors(updateJson, "productVariantsBulkUpdate");
    if (updateErrors.length > 0) {
      return {
        productId: input.knownProductId,
        variantId: input.knownVariantId,
        inventoryItemId: null,
        error: `productVariantsBulkUpdate failed: ${updateErrors.join("; ")}`,
      };
    }

    const productUpdateJson = await graphqlJson(
      input.admin,
      `#graphql
        mutation updateProduct($product: ProductUpdateInput!) {
          productUpdate(product: $product) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        product: {
          id: input.knownProductId,
          title,
          descriptionHtml,
          tags,
        },
      },
    );

    const productUpdateErrors = graphqlUserErrors(productUpdateJson, "productUpdate");
    if (productUpdateErrors.length > 0) {
      return {
        productId: input.knownProductId,
        variantId: input.knownVariantId,
        inventoryItemId: null,
        error: `productUpdate failed: ${productUpdateErrors.join("; ")}`,
      };
    }

    return {
      productId: input.knownProductId,
      variantId: input.knownVariantId,
      inventoryItemId: null,
      error: null,
    };
  }

  const searchQuery = `sku:${escapeSkuForSearch(input.sku)}`;
  const findJson = await graphqlJson(
    input.admin,
    `#graphql
      query variantBySku($query: String!) {
        productVariants(first: 5, query: $query) {
          edges {
            node {
              id
              sku
              product {
                id
                title
                tags
              }
            }
          }
        }
      }`,
    { query: searchQuery },
  );

  const existingEdges = (
    (((findJson.data as Record<string, unknown> | undefined)?.productVariants as Record<
      string,
      unknown
    > | undefined)?.edges as Array<Record<string, unknown>> | undefined) || []
  )
    .map((edge) => edge.node as Record<string, unknown>)
    .filter(Boolean);

  if (existingEdges.length > 1) {
      return {
        productId: null,
        variantId: null,
        inventoryItemId: null,
        error: `Multiple Shopify variants matched SKU ${input.sku}.`,
      };
  }

  const existingNode = existingEdges[0];

  if (existingNode?.id && (existingNode.product as Record<string, unknown> | undefined)?.id) {
    const existingProductId = (existingNode.product as Record<string, unknown>).id as string;
    const existingProduct = existingNode.product as Record<string, unknown>;
    const existingTags = (existingProduct.tags as string[] | undefined) || [];
    const tags = mergeAccountTag(existingTags, input.accountTag);
    const normalizedPrice = normalizePrice(input.price);

    const variantUpdateJson = await graphqlJson(
      input.admin,
      `#graphql
        mutation setVariantSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              sku
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        productId: existingProductId,
        variants: [
          {
            id: existingNode.id as string,
            inventoryItem: inventoryItemPayload,
            ...(normalizedPrice ? { price: normalizedPrice } : {}),
          },
        ],
      },
    );

    const variantUpdateErrors = graphqlUserErrors(
      variantUpdateJson,
      "productVariantsBulkUpdate",
    );
    if (variantUpdateErrors.length > 0) {
      return {
        productId: existingProductId,
        variantId: existingNode.id as string,
        inventoryItemId: null,
        error: `productVariantsBulkUpdate failed: ${variantUpdateErrors.join("; ")}`,
      };
    }

    const productUpdateJson = await graphqlJson(
      input.admin,
      `#graphql
        mutation updateProduct($product: ProductUpdateInput!) {
          productUpdate(product: $product) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        product: {
          id: existingProductId,
          title,
          descriptionHtml,
          tags,
        },
      },
    );

    const productUpdateErrors = graphqlUserErrors(productUpdateJson, "productUpdate");
    if (productUpdateErrors.length > 0) {
      return {
        productId: existingProductId,
        variantId: existingNode.id as string,
        inventoryItemId: null,
        error: `productUpdate failed: ${productUpdateErrors.join("; ")}`,
      };
    }

    return {
      productId: existingProductId,
      variantId: existingNode.id as string,
      inventoryItemId: null,
      error: null,
    };
  }

  const tags = mergeAccountTag([], input.accountTag);
  const createJson = await graphqlJson(
    input.admin,
    `#graphql
      mutation createProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      product: {
        title,
        ...(descriptionHtml ? { descriptionHtml } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        status: "ACTIVE",
      },
    },
  );

  const createErrors = graphqlUserErrors(createJson, "productCreate");
  if (createErrors.length > 0) {
    return {
      productId: null,
      variantId: null,
      inventoryItemId: null,
      error: `productCreate failed: ${createErrors.join("; ")}`,
    };
  }

  const createdProduct = (createJson.data as Record<string, unknown> | undefined)
    ?.productCreate as Record<string, unknown> | undefined;
  const product = createdProduct?.product as Record<string, unknown> | undefined;
  const productId = (product?.id as string | undefined) || null;
  const createdVariantEdge = (
    ((product?.variants as Record<string, unknown> | undefined)?.edges as Array<
      Record<string, unknown>
    > | undefined) || []
  )[0];
  const variantId = (createdVariantEdge?.node as Record<string, unknown> | undefined)?.id as
    | string
    | undefined;
  const inventoryItemId = (
    ((createdVariantEdge?.node as Record<string, unknown> | undefined)?.inventoryItem as Record<
      string,
      unknown
    > | undefined)?.id as string | undefined
  ) || null;

  if (!productId || !variantId) {
    return {
      productId,
      variantId: variantId || null,
      inventoryItemId,
      error: "productCreate succeeded but variant id was not returned.",
    };
  }

  const updateJson = await graphqlJson(
    input.admin,
    `#graphql
      mutation setVariantSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            sku
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      productId,
      variants: [
        {
          id: variantId,
          inventoryItem: inventoryItemPayload,
          ...(normalizePrice(input.price) ? { price: normalizePrice(input.price) } : {}),
        },
      ],
    },
  );

  const updateErrors = graphqlUserErrors(updateJson, "productVariantsBulkUpdate");
  if (updateErrors.length > 0) {
    return {
      productId,
      variantId,
      inventoryItemId,
      error: `productVariantsBulkUpdate failed: ${updateErrors.join("; ")}`,
    };
  }

  return {
    productId,
    variantId,
    inventoryItemId,
    error: null,
  };
}

async function getPrimaryLocationId(admin: ShopifyAdminClient): Promise<string | null> {
  const json = await graphqlJson(
    admin,
    `#graphql
      query firstLocation {
        locations(first: 1) {
          edges {
            node {
              id
              name
            }
          }
        }
      }`,
  );

  const first = (
    (((json.data as Record<string, unknown> | undefined)?.locations as Record<
      string,
      unknown
    > | undefined)?.edges as Array<Record<string, unknown>> | undefined) || []
  )[0];
  return ((first?.node as Record<string, unknown> | undefined)?.id as string | undefined) || null;
}

async function getShopCurrencyCode(admin: ShopifyAdminClient): Promise<string | null> {
  const json = await graphqlJson(
    admin,
    `#graphql
      query shopCurrency {
        shop {
          currencyCode
        }
      }`,
  );

  return (
    ((json.data as Record<string, unknown> | undefined)?.shop as Record<string, unknown> | undefined)
      ?.currencyCode as string | undefined
  ) || null;
}

async function fetchFrankfurterRate(fromCurrency: string, toCurrency: string) {
  const response = await fetchWithRetry(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    3,
  );

  const json = (await response.json()) as {
    amount?: number;
    base?: string;
    date?: string;
    rates?: Record<string, number>;
  };

  if (!response.ok || !json.rates?.[toCurrency]) {
    throw new Error(`Frankfurter rate fetch failed (${response.status}).`);
  }

  return json.rates[toCurrency];
}

function shouldRefreshAutoFxRate(input: {
  fetchedAt?: Date | string | null;
  targetCurrency?: string | null;
  nextTargetCurrency: string;
}) {
  if (!input.fetchedAt) return true;
  if (!input.targetCurrency) return true;
  if (input.targetCurrency.toUpperCase() !== input.nextTargetCurrency.toUpperCase()) {
    return true;
  }

  const fetchedAt =
    input.fetchedAt instanceof Date ? input.fetchedAt : new Date(input.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) return true;

  const ageMs = Date.now() - fetchedAt.getTime();
  return ageMs >= 24 * 60 * 60 * 1000;
}

async function getVariantInventoryRef(
  admin: ShopifyAdminClient,
  variantId: string,
): Promise<ShopifyInventoryRef> {
  const json = await graphqlJson(
    admin,
    `#graphql
      query variantInventory($id: ID!) {
        productVariant(id: $id) {
          id
          inventoryItem {
            id
            tracked
          }
        }
      }`,
    { id: variantId },
  );

  const variant = (json.data as Record<string, unknown> | undefined)
    ?.productVariant as Record<string, unknown> | undefined;
  const inventoryItem = variant?.inventoryItem as Record<string, unknown> | undefined;
  return {
    inventoryItemId: (inventoryItem?.id as string | undefined) || null,
    tracked:
      typeof inventoryItem?.tracked === "boolean"
        ? (inventoryItem.tracked as boolean)
        : null,
  };
}

async function getExistingProductImageUrls(
  admin: ShopifyAdminClient,
  productId: string,
): Promise<string[]> {
  const urls: string[] = [];
  let cursor: string | null = null;

  for (;;) {
    const json = await graphqlJson(
      admin,
      `#graphql
        query productImages($id: ID!, $after: String) {
          product(id: $id) {
            media(first: 100, after: $after) {
              nodes {
                ... on MediaImage {
                  image {
                    url
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }`,
      { id: productId, after: cursor },
    );

    const media = ((((json.data as Record<string, unknown> | undefined)?.product as Record<
      string,
      unknown
    > | undefined)?.media as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
    const nodes =
      (media.nodes as Array<Record<string, unknown>> | undefined) || [];
    const pageInfo = (media.pageInfo as Record<string, unknown> | undefined) || {};

    urls.push(
      ...nodes
        .map((node) => ((node.image as Record<string, unknown> | undefined)?.url as string | undefined) || null)
        .filter((url): url is string => Boolean(url)),
    );

    if (pageInfo.hasNextPage !== true || !pageInfo.endCursor) break;
    cursor = pageInfo.endCursor as string;
  }

  return urls;
}

async function syncShopifyProductImages(input: {
  admin: ShopifyAdminClient;
  productId: string;
  imageUrls?: string[];
}): Promise<string | null> {
  const incomingUrls = uniqueUrls(input.imageUrls || []).slice(0, 20);
  if (incomingUrls.length === 0) return null;

  const existingUrls = await getExistingProductImageUrls(input.admin, input.productId);
  const existingKeys = new Set(
    existingUrls
      .map((url) => normalizeImageUrlForComparison(url))
      .filter(Boolean),
  );
  const missingUrls = incomingUrls.filter((url) => {
    const normalized = normalizeImageUrlForComparison(url);
    return normalized ? !existingKeys.has(normalized) : !existingUrls.includes(url);
  });
  if (missingUrls.length === 0) return null;

  const json = await graphqlJson(
    input.admin,
    `#graphql
      mutation createMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            alt
            mediaContentType
            status
          }
          mediaUserErrors {
            field
            message
          }
        }
      }`,
    {
      productId: input.productId,
      media: missingUrls.map((url, index) => ({
        alt: `eBay image ${index + 1}`,
        mediaContentType: "IMAGE",
        originalSource: url,
      })),
    },
  );

  const node = (json.data as Record<string, unknown> | undefined)
    ?.productCreateMedia as Record<string, unknown> | undefined;
  const errors = (node?.mediaUserErrors as Array<Record<string, unknown>> | undefined) || [];
  const messages = errors
    .map((error) => error.message)
    .filter((message): message is string => typeof message === "string" && message.length > 0);
  return messages.length > 0 ? messages.join("; ") : null;
}

async function ensureInventoryTracking(
  admin: ShopifyAdminClient,
  inventoryItemId: string,
): Promise<string | null> {
  const json = await graphqlJson(
    admin,
    `#graphql
      mutation trackInventoryItem($id: ID!, $input: InventoryItemInput!) {
        inventoryItemUpdate(id: $id, input: $input) {
          inventoryItem {
            id
            tracked
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      id: inventoryItemId,
      input: { tracked: true },
    },
  );

  const userErrors = graphqlUserErrors(json, "inventoryItemUpdate");
  return userErrors.length > 0 ? userErrors.join("; ") : null;
}

async function setShopifyAvailableQuantity(input: {
  admin: ShopifyAdminClient;
  inventoryItemId: string;
  locationId: string;
  quantity: number;
}): Promise<string | null> {
  const json = await graphqlJson(
    input.admin,
    `#graphql
      mutation setInventory($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          userErrors {
            field
            message
          }
        }
      }`,
    {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities: [
          {
            inventoryItemId: input.inventoryItemId,
            locationId: input.locationId,
            quantity: input.quantity,
          },
        ],
      },
    },
  );

  const node = (json.data as Record<string, unknown> | undefined)
    ?.inventorySetQuantities as Record<string, unknown> | undefined;
  const userErrors = (node?.userErrors as Array<Record<string, unknown>> | undefined) || [];
  const messages = userErrors
    .map((e) => e.message)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  return messages.length > 0 ? messages.join("; ") : null;
}

function parseNextOffset(next?: string | null): number | null {
  if (!next) return null;
  try {
    const url = new URL(next, "https://api.ebay.com");
    const offset = Number(url.searchParams.get("offset"));
    return Number.isFinite(offset) ? offset : null;
  } catch {
    return null;
  }
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

function extractTagBlocks(block: string, tag: string) {
  return Array.from(
    block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi")),
  ).map(
    (match) => match[1],
  );
}

function extractTagAttribute(block: string, tag: string, attribute: string) {
  const match = block.match(
    new RegExp(`<${tag}([^>]*)>`, "i"),
  );
  if (!match?.[1]) return null;
  const attrMatch = match[1].match(
    new RegExp(`${attribute}=["']([^"']+)["']`, "i"),
  );
  return attrMatch?.[1] ? decodeXml(attrMatch[1].trim()) : null;
}

function parseTradingWeight(block: string) {
  const shippingBlock = extractTagValue(block, "ShippingPackageDetails") || block;
  const weightMajorRaw = extractTagValue(shippingBlock, "WeightMajor");
  const weightMinorRaw = extractTagValue(shippingBlock, "WeightMinor");
  const majorUnit = extractTagAttribute(shippingBlock, "WeightMajor", "unit");
  const minorUnit = extractTagAttribute(shippingBlock, "WeightMinor", "unit");

  const major = weightMajorRaw != null ? Number(weightMajorRaw) : null;
  const minor = weightMinorRaw != null ? Number(weightMinorRaw) : null;
  const normalizedMajorUnit = mapEbayWeightUnitToShopify(majorUnit);
  const normalizedMinorUnit = mapEbayWeightUnitToShopify(minorUnit);

  if (normalizedMajorUnit === "POUNDS") {
    const pounds = (Number.isFinite(major) ? Number(major) : 0) + ((normalizedMinorUnit === "OUNCES" && Number.isFinite(minor)) ? Number(minor) / 16 : 0);
    return pounds > 0 ? { weightValue: pounds, weightUnit: "POUNDS" } : null;
  }

  if (normalizedMajorUnit && Number.isFinite(major)) {
    return { weightValue: Number(major), weightUnit: normalizedMajorUnit };
  }

  if (normalizedMinorUnit && Number.isFinite(minor)) {
    return { weightValue: Number(minor), weightUnit: normalizedMinorUnit };
  }

  return null;
}

function uniqueUrls(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function normalizeImageUrlForComparison(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const basename = normalizedPath.split("/").filter(Boolean).pop() || normalizedPath;
    return basename.toLowerCase();
  } catch {
    const noQuery = trimmed.split("?")[0]?.replace(/\/+$/, "") || trimmed;
    return (noQuery.split("/").filter(Boolean).pop() || noQuery).toLowerCase();
  }
}

function parseTradingItems(xml: string): EbayTradingPage {
  const ack = extractTagValue(xml, "Ack");
  const errors = extractTagBlocks(xml, "Errors").map((errorBlock) => {
    const shortMessage = extractTagValue(errorBlock, "ShortMessage");
    const longMessage = extractTagValue(errorBlock, "LongMessage");
    const errorCode = extractTagValue(errorBlock, "ErrorCode");
    return [errorCode, shortMessage, longMessage].filter(Boolean).join(": ");
  });
  const activeListBlock = extractTagValue(xml, "ActiveList");
  const itemArrayBlock = activeListBlock ? extractTagValue(activeListBlock, "ItemArray") : null;
  const itemBlocks = itemArrayBlock ? extractTagBlocks(itemArrayBlock, "Item") : [];
  const items: EbayTradingItem[] = [];

  for (const itemBlock of itemBlocks) {
    const itemId = extractTagValue(itemBlock, "ItemID") || undefined;
    const title = extractTagValue(itemBlock, "Title") || undefined;
    const description = extractTagValue(itemBlock, "Description") || undefined;
    const quantityRaw = extractTagValue(itemBlock, "Quantity");
    const quantity = quantityRaw ? Number(quantityRaw) : undefined;
    const priceBlock = extractTagValue(itemBlock, "SellingStatus") || itemBlock;
    const currentPriceRaw =
      extractTagValue(priceBlock, "CurrentPrice") || extractTagValue(itemBlock, "StartPrice");
    const price = currentPriceRaw ? Number(currentPriceRaw) : undefined;
    const pictureDetails = extractTagValue(itemBlock, "PictureDetails") || "";
    const weight = parseTradingWeight(itemBlock);
    const pictureUrls = uniqueUrls([
      ...extractTagBlocks(pictureDetails, "PictureURL").map((value) => decodeXml(value.trim())),
      extractTagValue(itemBlock, "GalleryURL"),
      extractTagValue(itemBlock, "GalleryPlusPictureURL"),
      ...extractTagBlocks(itemBlock, "PictureURL").map((value) => decodeXml(value.trim())),
    ]);

    const variationBlocks = extractTagBlocks(itemBlock, "Variation");
    if (variationBlocks.length > 0) {
      for (const variationBlock of variationBlocks) {
        const variationSku = extractTagValue(variationBlock, "SKU") || undefined;
        const variationQuantityRaw = extractTagValue(variationBlock, "Quantity");
        const variationQuantity = variationQuantityRaw ? Number(variationQuantityRaw) : quantity;
        if (!variationSku) continue;
        items.push({
          sku: variationSku,
          itemId,
          title,
          description,
          quantity: variationQuantity,
          price,
          imageUrls: pictureUrls,
          variationKey: variationSku,
          weightValue: weight?.weightValue,
          weightUnit: weight?.weightUnit,
        });
      }
      continue;
    }

    const sku = extractTagValue(itemBlock, "SKU") || undefined;
    if (!sku) continue;

    items.push({
      sku,
      itemId,
      title,
      description,
      quantity,
      price,
      imageUrls: pictureUrls,
      weightValue: weight?.weightValue,
      weightUnit: weight?.weightUnit,
    });
  }

  const hasMore = (extractTagValue(xml, "HasMoreItems") || "").toLowerCase() === "true";
  return { items, hasMore, ack, errors };
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

  const res = await fetchWithRetry(
    `${getEbayIdentityBaseUrl()}/identity/v1/oauth2/token`,
    {
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
    },
    3,
  );

  const json = (await res.json()) as EbayTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(
      `eBay token exchange failed (${res.status}): ${json.error || "unknown_error"} ${json.error_description || ""}`,
    );
  }

  return json.access_token;
}

async function fetchInventoryPage(input: {
  accessToken: string;
  limit: number;
  offset: number;
}) {
  const url = new URL(`${getEbayApiBaseUrl()}/sell/inventory/v1/inventory_item`);
  url.searchParams.set("limit", String(input.limit));
  url.searchParams.set("offset", String(input.offset));

  const response = await fetchWithRetry(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Accept-Language": process.env.EBAY_ACCEPT_LANGUAGE || "en-US",
      },
    },
    3,
  );

  const text = await response.text();
  let json: EbayInventoryPage | Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as EbayInventoryPage;
  } catch {
    throw new Error(`eBay inventory response parse failed (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(`eBay inventory fetch failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return json as EbayInventoryPage;
}

async function fetchTradingActiveListings(input: {
  accessToken: string;
  limit: number;
  offset: number;
}) {
  const pageNumber = Math.floor(input.offset / input.limit) + 1;
  const response = await fetchWithRetry(
    `${getEbayApiBaseUrl()}/ws/api.dll`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "1231",
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-IAF-TOKEN": input.accessToken,
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>${input.limit}</EntriesPerPage>
      <PageNumber>${pageNumber}</PageNumber>
    </Pagination>
  </ActiveList>
</GetMyeBaySellingRequest>`,
    },
    3,
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`eBay trading fetch failed (${response.status}): ${text}`);
  }

  return parseTradingItems(text);
}

async function fetchTradingItemDetails(input: {
  accessToken: string;
  itemId: string;
}) {
  const response = await fetchWithRetry(
    `${getEbayApiBaseUrl()}/ws/api.dll`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-CALL-NAME": "GetItem",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "1231",
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-IAF-TOKEN": input.accessToken,
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${input.itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <IncludeItemSpecifics>true</IncludeItemSpecifics>
  <IncludeWatchCount>false</IncludeWatchCount>
  <OutputSelector>Item.Description</OutputSelector>
  <OutputSelector>Item.ShippingPackageDetails</OutputSelector>
</GetItemRequest>`,
    },
    3,
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`eBay GetItem failed (${response.status}): ${text}`);
  }

  const ack = extractTagValue(text, "Ack");
  if (ack && ack !== "Success" && ack !== "Warning") {
    const errors = extractTagBlocks(text, "Errors").map((errorBlock) => {
      const shortMessage = extractTagValue(errorBlock, "ShortMessage");
      const longMessage = extractTagValue(errorBlock, "LongMessage");
      const errorCode = extractTagValue(errorBlock, "ErrorCode");
      return [errorCode, shortMessage, longMessage].filter(Boolean).join(": ");
    });
    throw new Error(`eBay GetItem Ack=${ack}: ${errors.join(" | ") || "No error details."}`);
  }

  const itemBlock = extractTagValue(text, "Item") || "";
  const description = extractTagValue(itemBlock, "Description") || undefined;
  const weight = parseTradingWeight(itemBlock);

  return {
    description,
    weightValue: weight?.weightValue,
    weightUnit: weight?.weightUnit,
  };
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

async function parseRequestBody(request: Request): Promise<EnqueueBody> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as EnqueueBody;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const ebayAccountIdRaw = form.get("ebayAccountId");
    const parsedAccountId =
      typeof ebayAccountIdRaw === "string" && ebayAccountIdRaw.length > 0
        ? Number(ebayAccountIdRaw)
        : undefined;

    let parsedItems: SyncInputItem[] = [];
    const itemsJson = form.get("itemsJson");
    if (typeof itemsJson === "string" && itemsJson.trim().length > 0) {
      try {
        const candidate = JSON.parse(itemsJson);
        if (Array.isArray(candidate)) {
          parsedItems = candidate as SyncInputItem[];
        }
      } catch {
        parsedItems = [];
      }
    }

    return {
      shop: form.get("shop")?.toString() || undefined,
      mode: (form.get("mode")?.toString() as "rolling" | "full") || undefined,
      ebayAccountId:
        parsedAccountId !== undefined && Number.isFinite(parsedAccountId)
          ? parsedAccountId
          : undefined,
      limit: Number(form.get("limit") || 50),
      cursor: form.get("cursor")?.toString() || null,
      nextCursor: form.get("nextCursor")?.toString() || null,
      fullScanComplete: form
        .getAll("fullScanComplete")
        .map((v) => v.toString())
        .includes("true"),
      items: parsedItems,
    };
  }

  return {};
}

async function resolveStore(shop: string) {
  return db.store.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

async function resolveEbayAccount(storeId: number, requestedId?: number) {
  if (requestedId) {
    return db.ebayAccount.findFirst({
      where: { id: requestedId, storeId },
    });
  }

  return db.ebayAccount.findFirst({
    where: { storeId, status: "connected" },
    orderBy: { id: "asc" },
  });
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

  let body: EnqueueBody = {};
  try {
    body = await parseRequestBody(request);
  } catch {
    body = {};
  }

  const shop = body.shop ?? "unknown-shop.local";
  const mode = parseMode(body.mode);
  const store = await resolveStore(shop);
  const syncFieldSet = new Set(
    store.syncFields
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const ebayAccount = await resolveEbayAccount(store.id, body.ebayAccountId);

  if (!ebayAccount) {
    return Response.json(
      {
        accepted: false,
        error: "ebay_account_not_found",
        shop,
        storeId: store.id,
      },
      { status: 400 },
    );
  }

  const run = await db.syncRun.create({
    data: {
      storeId: store.id,
      ebayAccountId: ebayAccount.id,
      mode,
      status: "running",
      message: "Sync started.",
    },
  });

  const counters: RunCounters = {
    totalItems: 0,
    processedItems: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    conflictCount: 0,
    missingCount: 0,
    errorCount: 0,
  };

  let inputItems: SyncInputItem[] = Array.isArray(body.items) ? body.items : [];
  let source: "manual" | "ebay_api" = "manual";
  let nextOffset: number | null = null;
  let shopifyAdmin: ShopifyAdminClient | null = null;
  let locationId: string | null = null;

  try {
    if (inputItems.length === 0) {
      source = "ebay_api";
      const checkpoint = await db.syncCheckpoint.findUnique({
        where: { ebayAccountId: ebayAccount.id },
        select: { cursor: true },
      });

      const fallbackScopes =
        process.env.EBAY_OAUTH_SCOPES ||
        "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly";
      const accessToken = await getAccessToken(
        ebayAccount.refreshTokenEnc,
        ebayAccount.scopes || fallbackScopes,
      );

      const requestedLimit = Number.isFinite(body.limit) ? Number(body.limit) : 50;
      const limit = Math.max(1, Math.min(200, requestedLimit || 50));
      const initialOffset = body.cursor ?? checkpoint?.cursor;
      const offset = Number.isFinite(Number(initialOffset)) ? Number(initialOffset) : 0;

      const inventoryPage = await fetchInventoryPage({ accessToken, limit, offset });
      const fetchedItems = Array.isArray(inventoryPage.inventoryItems)
        ? inventoryPage.inventoryItems
        : [];

      if (fetchedItems.length > 0) {
        inputItems = fetchedItems.map((it) => ({
          sku: it.sku,
          itemId: undefined,
          variationKey: undefined,
          lastModified: undefined,
          title: it.product?.title,
          description: it.product?.description,
          quantity: it.availability?.shipToLocationAvailability?.quantity,
          price: it.price?.value ? Number(it.price.value) : undefined,
          imageUrls: it.product?.imageUrls || [],
          weightValue: it.packageWeightAndSize?.weight?.value,
          weightUnit: it.packageWeightAndSize?.weight?.unit,
        }));
        nextOffset = parseNextOffset(inventoryPage.next || null);
      } else {
        const tradingPage = await fetchTradingActiveListings({
          accessToken,
          limit,
          offset,
        });

        if (
          tradingPage.ack &&
          tradingPage.ack !== "Success" &&
          tradingPage.ack !== "Warning"
        ) {
          throw new Error(
            `eBay trading fetch returned Ack=${tradingPage.ack}: ${tradingPage.errors.join(" | ") || "No error details."}`,
          );
        }

        inputItems = tradingPage.items.map((it) => ({
          sku: it.sku,
          itemId: it.itemId,
          variationKey: it.variationKey,
          lastModified: it.lastModified,
          title: it.title,
          description: it.description,
          quantity: it.quantity,
          price: it.price,
          imageUrls: it.imageUrls || [],
          weightValue: it.weightValue,
          weightUnit: it.weightUnit,
        }));

        const detailItemIds = Array.from(
          new Set(
            inputItems
              .map((item) => item.itemId?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        );

        if (detailItemIds.length > 0) {
          const detailsByItemId = new Map<string, Awaited<ReturnType<typeof fetchTradingItemDetails>>>();
          for (const itemId of detailItemIds) {
            try {
              const details = await fetchTradingItemDetails({ accessToken, itemId });
              detailsByItemId.set(itemId, details);
            } catch (error) {
              await db.syncError.create({
                data: {
                  runId: run.id,
                  storeId: store.id,
                  ebayAccountId: ebayAccount.id,
                  errorCode: "EBAY_GET_ITEM_FAILED",
                  errorMessage: error instanceof Error ? error.message : String(error),
                  ebayItemId: itemId,
                },
              });
            }
          }

          inputItems = inputItems.map((item) => {
            const itemId = item.itemId?.trim();
            if (!itemId) return item;
            const details = detailsByItemId.get(itemId);
            if (!details) return item;
            return {
              ...item,
              description: details.description ?? item.description,
              weightValue: details.weightValue ?? item.weightValue,
              weightUnit: details.weightUnit ?? item.weightUnit,
            };
          });
        }

        nextOffset = tradingPage.hasMore ? offset + limit : null;

        if (inputItems.length === 0) {
          await db.syncError.create({
            data: {
              runId: run.id,
              storeId: store.id,
              ebayAccountId: ebayAccount.id,
              errorCode: "EBAY_EMPTY_RESULT",
              errorMessage: `eBay returned zero items. Inventory API empty; Trading API Ack=${tradingPage.ack || "unknown"}; errors=${tradingPage.errors.join(" | ") || "none"}.`,
            },
          });
        }
      }

      counters.totalItems = inputItems.length;
    }
  } catch (error) {
    counters.errorCount += 1;
    await db.syncError.create({
      data: {
        runId: run.id,
        storeId: store.id,
        ebayAccountId: ebayAccount.id,
        errorCode: "EBAY_FETCH_ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown eBay fetch error.",
      },
    });
  }

  counters.totalItems = Math.max(counters.totalItems, inputItems.length);

  try {
    const unauth = await unauthenticated.admin(store.shop);
    shopifyAdmin = unauth.admin as ShopifyAdminClient;
    locationId = await getPrimaryLocationId(shopifyAdmin);
  } catch (error) {
    counters.errorCount += 1;
    await db.syncError.create({
      data: {
        runId: run.id,
        storeId: store.id,
        ebayAccountId: ebayAccount.id,
        errorCode: "SHOPIFY_ADMIN_UNAVAILABLE",
        errorMessage:
          error instanceof Error ? error.message : "Failed to initialize Shopify admin context.",
      },
    });
  }

  let activeFxRate = store.fixedFxRate;
  const ebayAccountTag = buildEbayAccountTag({
    ebayUserId: ebayAccount.ebayUserId,
    fallbackLabel: ebayAccount.label,
  });
  if (shopifyAdmin && store.priceSyncEnabled && store.fxRateMode === "auto") {
    try {
      const targetCurrency = (await getShopCurrencyCode(shopifyAdmin)) || "JPY";
      const normalizedTargetCurrency = targetCurrency.toUpperCase();
      const canReuseSavedRate =
        store.autoFxLastRate != null &&
        !shouldRefreshAutoFxRate({
          fetchedAt: store.autoFxLastFetchedAt,
          targetCurrency: store.autoFxLastTargetCurrency,
          nextTargetCurrency: normalizedTargetCurrency,
        });

      if (canReuseSavedRate) {
        activeFxRate = store.autoFxLastRate!;
      } else {
        activeFxRate =
          normalizedTargetCurrency === "USD"
            ? 1
            : await fetchFrankfurterRate("USD", normalizedTargetCurrency);

        await db.store.update({
          where: { id: store.id },
          data: {
            autoFxLastRate: activeFxRate,
            autoFxLastFetchedAt: new Date(),
            autoFxLastTargetCurrency: normalizedTargetCurrency,
          },
        });
      }
    } catch (error) {
      counters.errorCount += 1;
      await db.syncError.create({
        data: {
          runId: run.id,
          storeId: store.id,
          ebayAccountId: ebayAccount.id,
          errorCode: "FX_RATE_FETCH_ERROR",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to fetch automatic FX rate.",
        },
      });
    }
  }

  for (const item of inputItems) {
    const sku = item.sku?.trim();
    const ebayItemId = item.itemId?.trim() || null;
    const incomingModified = parseLastModified(item.lastModified);

    if (!sku) {
      counters.errorCount += 1;
      await db.syncError.create({
        data: {
          runId: run.id,
          storeId: store.id,
          ebayAccountId: ebayAccount.id,
          errorCode: "SKU_MISSING",
          errorMessage: "SKU is required for synchronization.",
          ebayItemId,
          payload: JSON.stringify(item),
        },
      });
      continue;
    }

    const existing = await db.skuLink.findUnique({
      where: { storeId_sku: { storeId: store.id, sku } },
      include: {
        ebayAccount: {
          select: {
            id: true,
            status: true,
            ebayUserId: true,
          },
        },
      },
    });

    if (existing && existing.ebayAccountId !== ebayAccount.id) {
      const existingAccountIsReusable =
        existing.ebayAccount.status !== "connected" ||
        Boolean(
          existing.ebayAccount.ebayUserId &&
            ebayAccount.ebayUserId &&
            existing.ebayAccount.ebayUserId === ebayAccount.ebayUserId,
        );

      if (existingAccountIsReusable) {
        await db.skuLink.update({
          where: { id: existing.id },
          data: {
            ebayAccountId: ebayAccount.id,
            syncStatus: "ok",
            lastError: null,
          },
        });

        await db.skuConflict.updateMany({
          where: {
            storeId: store.id,
            sku,
            status: "open",
          },
          data: {
            status: "resolved",
            note: `Auto-resolved after reconnect to account ${ebayAccount.id}.`,
          },
        });
      } else {
      counters.conflictCount += 1;
      const accountIds = [existing.ebayAccountId, ebayAccount.id].sort((a, b) => a - b);
      await db.skuConflict.upsert({
        where: { storeId_sku: { storeId: store.id, sku } },
        create: {
          storeId: store.id,
          sku,
          foundInAccounts: JSON.stringify(accountIds),
          status: "open",
        },
        update: {
          foundInAccounts: JSON.stringify(accountIds),
          lastDetectedAt: new Date(),
          status: "open",
        },
      });

      await db.skuLink.update({
        where: { id: existing.id },
        data: {
          syncStatus: "conflict",
          lastError: `Conflict: detected in multiple accounts (${accountIds.join(", ")}).`,
          lastSeenInRunId: run.id,
        },
      });
      continue;
      }
    }

    const shouldSkipByTimestamp =
      Boolean(existing) &&
      Boolean(existing?.ebayLastModified) &&
      Boolean(incomingModified) &&
      incomingModified!.getTime() <= existing!.ebayLastModified!.getTime();

    // Skip only when we already have Shopify mapping for this SKU.
    // If mapping is missing, force Shopify upsert even when eBay data itself is unchanged.
    const hasShopifyMapping =
      Boolean(existing?.shopifyProductId) && Boolean(existing?.shopifyVariantId);
    const shouldSkip = shouldSkipByTimestamp && hasShopifyMapping;

    if (shouldSkip && existing) {
      counters.skippedCount += 1;
      await db.skuLink.update({
        where: { id: existing.id },
        data: {
          syncStatus: "skipped",
          lastSeenInRunId: run.id,
          updatedAt: new Date(),
        },
      });
      continue;
    }

    let shopifyProductId: string | null = null;
    let shopifyVariantId: string | null = null;

    try {
      if (!shopifyAdmin) {
        throw new Error("Shopify admin context not initialized.");
      }
      const upsertResult = await upsertShopifyProductBySku({
        admin: shopifyAdmin,
        sku,
        title: item.title,
        description: item.description,
        price:
          store.priceSyncEnabled
            ? convertEbayPriceToShopify({
                price: item.price ?? null,
                fixedFxRate: activeFxRate,
                priceAdjustmentPercent: store.priceAdjustmentPercent,
                priceAdjustmentFixed: store.priceAdjustmentFixed,
                roundRule: store.roundRule,
              })
            : null,
        weightValue: syncFieldSet.has("weight") ? item.weightValue ?? null : null,
        weightUnit: syncFieldSet.has("weight") ? item.weightUnit ?? null : null,
        accountTag: ebayAccountTag,
        knownVariantId: existing?.shopifyVariantId ?? null,
        knownProductId: existing?.shopifyProductId ?? null,
      });

      if (upsertResult.error) {
        counters.errorCount += 1;
        await db.syncError.create({
          data: {
            runId: run.id,
            storeId: store.id,
            ebayAccountId: ebayAccount.id,
            sku,
            ebayItemId,
            errorCode: "SHOPIFY_UPSERT_ERROR",
            errorMessage: upsertResult.error,
          },
        });
        continue;
      }

      shopifyProductId = upsertResult.productId;
      shopifyVariantId = upsertResult.variantId;

      if (shopifyProductId && syncFieldSet.has("images")) {
        const imageSyncError = await syncShopifyProductImages({
          admin: shopifyAdmin,
          productId: shopifyProductId,
          imageUrls: item.imageUrls,
        });

        if (imageSyncError) {
          counters.errorCount += 1;
          await db.syncError.create({
            data: {
              runId: run.id,
              storeId: store.id,
              ebayAccountId: ebayAccount.id,
              sku,
              ebayItemId,
              errorCode: "SHOPIFY_IMAGE_SYNC_ERROR",
              errorMessage: imageSyncError,
            },
          });
          continue;
        }
      }

      if (locationId && shopifyVariantId && Number.isFinite(item.quantity)) {
        const quantity = Math.max(0, Number(item.quantity));
        const inventoryRef = await getVariantInventoryRef(shopifyAdmin, shopifyVariantId);
        if (!inventoryRef.inventoryItemId) {
          counters.errorCount += 1;
          await db.syncError.create({
            data: {
              runId: run.id,
              storeId: store.id,
              ebayAccountId: ebayAccount.id,
              sku,
              ebayItemId,
              errorCode: "SHOPIFY_INVENTORY_ERROR",
              errorMessage: "No inventory item found for Shopify variant.",
            },
          });
          continue;
        }

        if (inventoryRef.tracked === false) {
          const trackError = await ensureInventoryTracking(
            shopifyAdmin,
            inventoryRef.inventoryItemId,
          );
          if (trackError) {
            counters.errorCount += 1;
            await db.syncError.create({
              data: {
                runId: run.id,
                storeId: store.id,
                ebayAccountId: ebayAccount.id,
                sku,
                ebayItemId,
                errorCode: "SHOPIFY_INVENTORY_ERROR",
                errorMessage: `Failed to enable inventory tracking: ${trackError}`,
              },
            });
            continue;
          }
        }

        const setQtyError = await setShopifyAvailableQuantity({
          admin: shopifyAdmin,
          inventoryItemId: inventoryRef.inventoryItemId,
          locationId,
          quantity,
        });
        if (setQtyError) {
          counters.errorCount += 1;
          await db.syncError.create({
            data: {
              runId: run.id,
              storeId: store.id,
              ebayAccountId: ebayAccount.id,
              sku,
              ebayItemId,
              errorCode: "SHOPIFY_INVENTORY_ERROR",
              errorMessage: `Failed to set inventory quantity: ${setQtyError}`,
            },
          });
          continue;
        }
      }
    } catch (error) {
      counters.errorCount += 1;
      await db.syncError.create({
        data: {
          runId: run.id,
          storeId: store.id,
          ebayAccountId: ebayAccount.id,
          sku,
          ebayItemId,
          errorCode: "SHOPIFY_UPSERT_ERROR",
          errorMessage:
            error instanceof Error ? error.message : "Failed to upsert Shopify product.",
        },
      });
      continue;
    }

    await db.skuLink.upsert({
      where: { storeId_sku: { storeId: store.id, sku } },
      create: {
        storeId: store.id,
        sku,
        ebayAccountId: ebayAccount.id,
        ebayItemId,
        ebayVariationKey: item.variationKey?.trim() || null,
        ebayLastModified: incomingModified,
        shopifyProductId,
        shopifyVariantId,
        syncStatus: "ok",
        lastSyncAt: new Date(),
        lastSeenInRunId: run.id,
        lastError: null,
      },
      update: {
        ebayAccountId: ebayAccount.id,
        ebayItemId,
        ebayVariationKey: item.variationKey?.trim() || null,
        ebayLastModified: incomingModified,
        shopifyProductId,
        shopifyVariantId,
        syncStatus: "ok",
        lastSyncAt: new Date(),
        lastSeenInRunId: run.id,
        lastError: null,
      },
    });

    counters.processedItems += 1;
    if (existing) {
      counters.updatedCount += 1;
    } else {
      counters.createdCount += 1;
    }
  }

  const fullScanComplete =
    typeof body.fullScanComplete === "boolean" ? body.fullScanComplete : source === "ebay_api" && nextOffset === null;

  if (fullScanComplete) {
    const missingLinks = await db.skuLink.findMany({
      where: {
        storeId: store.id,
        ebayAccountId: ebayAccount.id,
        lastSeenInRunId: { not: run.id },
      },
      select: {
        id: true,
        sku: true,
        shopifyProductId: true,
        shopifyVariantId: true,
      },
    });

    counters.missingCount = missingLinks.length;

    for (const missing of missingLinks) {
      let nextStatus: "missing_on_ebay" | "error" = "missing_on_ebay";
      let lastError = "SKU not detected in the latest completed full scan.";

      const hasMapping = Boolean(missing.shopifyProductId) && Boolean(missing.shopifyVariantId);
      if (hasMapping) {
        if (!shopifyAdmin || !locationId) {
          nextStatus = "error";
          lastError =
            "Missing Shopify admin/location context while setting missing SKU inventory to zero.";
        } else {
          try {
            const inventoryRef = await getVariantInventoryRef(
              shopifyAdmin,
              missing.shopifyVariantId as string,
            );
            if (!inventoryRef.inventoryItemId) {
              nextStatus = "error";
              lastError = "No inventory item found for missing SKU Shopify variant.";
            } else {
              if (inventoryRef.tracked === false) {
                const trackError = await ensureInventoryTracking(
                  shopifyAdmin,
                  inventoryRef.inventoryItemId,
                );
                if (trackError) {
                  nextStatus = "error";
                  lastError = `Failed to enable inventory tracking: ${trackError}`;
                }
              }

              if (nextStatus !== "error") {
                const setQtyError = await setShopifyAvailableQuantity({
                  admin: shopifyAdmin,
                  inventoryItemId: inventoryRef.inventoryItemId,
                  locationId,
                  quantity: 0,
                });
                if (setQtyError) {
                  nextStatus = "error";
                  lastError = `Failed to set missing SKU inventory to zero: ${setQtyError}`;
                }
              }
            }
          } catch (error) {
            nextStatus = "error";
            lastError =
              error instanceof Error
                ? error.message
                : "Unknown error while applying missing SKU stock=0.";
          }
        }
      }

      await db.skuLink.update({
        where: { id: missing.id },
        data: {
          syncStatus: nextStatus,
          lastError,
        },
      });

      if (nextStatus === "error") {
        counters.errorCount += 1;
        await db.syncError.create({
          data: {
            runId: run.id,
            storeId: store.id,
            ebayAccountId: ebayAccount.id,
            sku: missing.sku,
            errorCode: "SHOPIFY_MISSING_STOCK_ZERO_FAILED",
            errorMessage: lastError,
          },
        });
      }
    }
  }

  const checkpointCursor =
    source === "ebay_api"
      ? nextOffset !== null
        ? String(nextOffset)
        : null
      : body.nextCursor ?? body.cursor ?? null;

  await db.syncCheckpoint.upsert({
    where: { ebayAccountId: ebayAccount.id },
    create: {
      ebayAccountId: ebayAccount.id,
      cursor: checkpointCursor,
      mode,
      lastError: counters.errorCount > 0 ? "Run completed with errors." : null,
    },
    update: {
      cursor: checkpointCursor,
      mode,
      lastError: counters.errorCount > 0 ? "Run completed with errors." : null,
    },
  });

  const finalStatus = buildFinalRunStatus(counters);
  await db.syncRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      endedAt: new Date(),
      totalItems: counters.totalItems,
      processedItems: counters.processedItems,
      createdCount: counters.createdCount,
      updatedCount: counters.updatedCount,
      skippedCount: counters.skippedCount,
      conflictCount: counters.conflictCount,
      missingCount: counters.missingCount,
      errorCount: counters.errorCount,
      message:
        inputItems.length === 0
          ? "No items processed."
          : source === "ebay_api"
            ? "Sync core processing finished (source: eBay API)."
            : "Sync core processing finished (source: manual items).",
    },
  });

  await notifyRunIssue({
    shop: store.shop,
    runId: run.id,
    status: finalStatus,
    errorNotifyEmail: store.errorNotifyEmail,
    slackNotifyWebhookUrl: store.slackNotifyWebhookUrl,
    counters,
  });

  return Response.json(
    {
      accepted: true,
      jobId: run.id,
      mode,
      shop,
      storeId: store.id,
      ebayAccountId: ebayAccount.id,
      source,
      checkpointCursor,
      fullScanComplete,
      counters,
      note:
        source === "ebay_api"
          ? "Phase-3 core sync executed with eBay Inventory API page fetch."
          : "Phase-3 core sync executed for provided input items.",
    },
    { status: 200 },
  );
};
