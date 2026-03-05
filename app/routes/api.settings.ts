import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type SettingsPayload = {
  syncFrequencyMinutes?: number;
  syncFields?: string[];
  priceSyncEnabled?: boolean;
  fixedFxRate?: number;
  roundRule?: string;
  errorNotifyEmail?: string | null;
};

function normalizeSyncFields(value?: string[] | string) {
  if (!value) return "title,description,images,weight,stock,price";
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean).join(",");
  return value;
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
      syncFields: store.syncFields.split(",").filter(Boolean),
      priceSyncEnabled: store.priceSyncEnabled,
      fixedFxRate: store.fixedFxRate,
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
      const syncFields = form
        .get("syncFields")
        ?.toString()
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      body = {
        syncFrequencyMinutes: Number(form.get("syncFrequencyMinutes") || 30),
        syncFields,
        priceSyncEnabled: form.get("priceSyncEnabled")?.toString() === "true",
        fixedFxRate: Number(form.get("fixedFxRate") || 150),
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
        body.syncFrequencyMinutes && body.syncFrequencyMinutes > 0
          ? body.syncFrequencyMinutes
          : store.syncFrequencyMinutes,
      syncFields: normalizeSyncFields(body.syncFields),
      priceSyncEnabled:
        typeof body.priceSyncEnabled === "boolean"
          ? body.priceSyncEnabled
          : store.priceSyncEnabled,
      fixedFxRate:
        body.fixedFxRate && body.fixedFxRate > 0 ? body.fixedFxRate : store.fixedFxRate,
      roundRule: body.roundRule?.trim() || store.roundRule,
      errorNotifyEmail: body.errorNotifyEmail?.trim() || null,
    },
  });

  return Response.json({
    updated: true,
    settings: {
      syncFrequencyMinutes: updated.syncFrequencyMinutes,
      syncFields: updated.syncFields.split(",").filter(Boolean),
      priceSyncEnabled: updated.priceSyncEnabled,
      fixedFxRate: updated.fixedFxRate,
      roundRule: updated.roundRule,
      errorNotifyEmail: updated.errorNotifyEmail,
    },
  });
};
