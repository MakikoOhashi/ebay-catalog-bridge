import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const store = await db.store.findUnique({
    where: { shop: session.shop },
    select: { id: true },
  });

  if (!store) {
    return Response.json({ disconnected: false, error: "store_not_found" }, { status: 404 });
  }

  const form = await request.formData();
  const accountIdRaw = form.get("accountId")?.toString() || "";
  const accountId = Number(accountIdRaw);

  if (!Number.isFinite(accountId) || accountId <= 0) {
    return Response.json({ disconnected: false, error: "invalid_account_id" }, { status: 400 });
  }

  const account = await db.ebayAccount.findFirst({
    where: { id: accountId, storeId: store.id },
    select: { id: true, label: true },
  });

  if (!account) {
    return Response.json({ disconnected: false, error: "account_not_found" }, { status: 404 });
  }

  await db.$transaction([
    db.ebayAccount.update({
      where: { id: account.id },
      data: {
        status: "revoked",
        refreshTokenEnc: "",
        scopes: "",
      },
    }),
    db.syncCheckpoint.deleteMany({
      where: { ebayAccountId: account.id },
    }),
  ]);

  return Response.json({
    disconnected: true,
    accountId: account.id,
    label: account.label,
  });
};
