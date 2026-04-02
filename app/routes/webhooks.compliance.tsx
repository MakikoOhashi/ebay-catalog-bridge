import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} compliance webhook for ${shop}`);

    switch (topic) {
      case "shop/redact": {
        await db.session.deleteMany({ where: { shop } });
        await db.store.deleteMany({ where: { shop } });
        break;
      }
      case "customers/data_request":
      case "customers/redact": {
        // This app does not store customer PII beyond support-form submissions,
        // so the webhook is acknowledged after signature verification.
        console.log(
          `[compliance] acknowledged ${topic} for ${shop}: ${JSON.stringify(payload)}`,
        );
        break;
      }
      default: {
        console.warn(`[compliance] unsupported topic received: ${topic}`);
        break;
      }
    }

    return new Response();
  } catch (error) {
    console.error("[compliance] webhook handling failed", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
