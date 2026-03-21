import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type SettingsPayload = {
  syncFrequencyMinutes?: number;
  syncFields?: string[];
  priceSyncEnabled?: boolean;
  fxRateMode?: string;
  fixedFxRate?: number;
  priceAdjustmentPercent?: number;
  priceAdjustmentFixed?: number;
  roundRule?: string;
  errorNotifyEmail?: string | null;
};

const allowedSyncFrequencyMinutes = new Set([1440]);

function normalizeSyncFields(value?: string[] | string) {
  if (!value) return "title,description,images,weight,stock";
  const normalized = Array.isArray(value)
    ? value.map((v) => v.trim()).filter(Boolean)
    : value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
  return normalized.filter((field) => field !== "price").join(",");
}

async function getOrCreateStore(shop: string) {
  return db.store.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await getOrCreateStore(session.shop);

  return Response.json({
    shop: store.shop,
    settings: {
      syncFrequencyMinutes: store.syncFrequencyMinutes,
      syncFields: store.syncFields.split(",").filter((field) => Boolean(field) && field !== "price"),
      priceSyncEnabled: store.priceSyncEnabled,
      fxRateMode: store.fxRateMode,
      fixedFxRate: store.fixedFxRate,
      autoFxLastRate: store.autoFxLastRate,
      autoFxLastFetchedAt: store.autoFxLastFetchedAt,
      autoFxLastTargetCurrency: store.autoFxLastTargetCurrency,
      priceAdjustmentPercent: store.priceAdjustmentPercent,
      priceAdjustmentFixed: store.priceAdjustmentFixed,
      roundRule: store.roundRule,
      errorNotifyEmail: store.errorNotifyEmail,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const method = request.method.toUpperCase();
  if (method !== "PUT" && method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const store = await getOrCreateStore(session.shop);
  let body: SettingsPayload = {};

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = (await request.json()) as SettingsPayload;
    } else {
      const form = await request.formData();
      const priceSyncEnabledValues = form
        .getAll("priceSyncEnabled")
        .map((value) => value.toString());
      const syncFields = form
        .getAll("syncFields")
        .map((value) => value.toString().trim())
        .filter(Boolean);
      body = {
        syncFrequencyMinutes: Number(form.get("syncFrequencyMinutes") || 1440),
        syncFields,
        priceSyncEnabled: priceSyncEnabledValues.includes("true"),
        fxRateMode: form.get("fxRateMode")?.toString() || "fixed",
        fixedFxRate: Number(form.get("fixedFxRate") || 150),
        priceAdjustmentPercent: Number(form.get("priceAdjustmentPercent") || 0),
        priceAdjustmentFixed: Number(form.get("priceAdjustmentFixed") || 0),
        roundRule: form.get("roundRule")?.toString() || "nearest",
        errorNotifyEmail: form.get("errorNotifyEmail")?.toString() || null,
      };
    }
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const updated = await db.store.update({
    where: { id: store.id },
    data: {
      syncFrequencyMinutes:
        body.syncFrequencyMinutes && allowedSyncFrequencyMinutes.has(body.syncFrequencyMinutes)
          ? body.syncFrequencyMinutes
          : allowedSyncFrequencyMinutes.has(store.syncFrequencyMinutes)
            ? store.syncFrequencyMinutes
            : 60,
      syncFields: normalizeSyncFields(body.syncFields),
      priceSyncEnabled:
        typeof body.priceSyncEnabled === "boolean"
          ? body.priceSyncEnabled
          : store.priceSyncEnabled,
      fxRateMode:
        body.fxRateMode === "auto" || body.fxRateMode === "fixed"
          ? body.fxRateMode
          : store.fxRateMode,
      fixedFxRate:
        body.fixedFxRate && body.fixedFxRate > 0 ? body.fixedFxRate : store.fixedFxRate,
      priceAdjustmentPercent:
        typeof body.priceAdjustmentPercent === "number" &&
        Number.isFinite(body.priceAdjustmentPercent)
          ? body.priceAdjustmentPercent
          : store.priceAdjustmentPercent,
      priceAdjustmentFixed:
        typeof body.priceAdjustmentFixed === "number" && Number.isFinite(body.priceAdjustmentFixed)
          ? body.priceAdjustmentFixed
          : store.priceAdjustmentFixed,
      roundRule: body.roundRule?.trim() || store.roundRule,
      errorNotifyEmail: body.errorNotifyEmail?.trim() || null,
    },
  });

  return Response.json({
    updated: true,
    settings: {
      syncFrequencyMinutes: updated.syncFrequencyMinutes,
      syncFields: updated.syncFields.split(",").filter((field) => Boolean(field) && field !== "price"),
      priceSyncEnabled: updated.priceSyncEnabled,
      fxRateMode: updated.fxRateMode,
      fixedFxRate: updated.fixedFxRate,
      autoFxLastRate: updated.autoFxLastRate,
      autoFxLastFetchedAt: updated.autoFxLastFetchedAt,
      autoFxLastTargetCurrency: updated.autoFxLastTargetCurrency,
      priceAdjustmentPercent: updated.priceAdjustmentPercent,
      priceAdjustmentFixed: updated.priceAdjustmentFixed,
      roundRule: updated.roundRule,
      errorNotifyEmail: updated.errorNotifyEmail,
    },
  });
};
