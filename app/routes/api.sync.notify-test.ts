import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const webhook = process.env.ERROR_NOTIFY_WEBHOOK_URL?.trim();

  if (!webhook) {
    return Response.json(
      {
        sent: false,
        error: "missing_error_notify_webhook_url",
        requiredEnv: "ERROR_NOTIFY_WEBHOOK_URL",
      },
      { status: 400 },
    );
  }

  const payload = {
    type: "sync_run_issue_test",
    shop: session.shop,
    message: "Manual test notification from Sync Console.",
    createdAt: new Date().toISOString(),
  };

  const text = [
    ":white_check_mark: ebay-catalog-bridge notify test",
    `shop=${session.shop}`,
    `at=${payload.createdAt}`,
  ].join(" | ");

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Notification test sent*\n• shop: \`${session.shop}\`\n• at: \`${payload.createdAt}\``,
            },
          },
        ],
        metadata: payload,
      }),
    });

    return Response.json({
      sent: response.ok,
      status: response.status,
      webhook,
      payload,
    });
  } catch (error) {
    return Response.json(
      {
        sent: false,
        error: "webhook_request_failed",
        detail: error instanceof Error ? error.message : "Unknown webhook error",
      },
      { status: 500 },
    );
  }
};
