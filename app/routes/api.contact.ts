import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function normalizeText(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const rawName = String(formData.get("name") || "");
  const rawEmail = String(formData.get("email") || "");
  const rawMessage = String(formData.get("message") || "");
  const attachment = formData.get("attachment");

  const name = normalizeText(rawName);
  const email = normalizeEmail(rawEmail);
  const message = rawMessage.trim();

  if (!name) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      {
        error: "Contact form is not configured yet. Set RESEND_API_KEY.",
      },
      { status: 500 },
    );
  }

  const attachments: Array<{ filename: string; content: string }> = [];

  if (attachment instanceof File && attachment.size > 0) {
    const maxSize = 5 * 1024 * 1024;
    if (attachment.size > maxSize) {
      return Response.json({ error: "Attachment must be 5 MB or smaller." }, { status: 400 });
    }

    const buffer = Buffer.from(await attachment.arrayBuffer());
    attachments.push({
      filename: attachment.name || "attachment",
      content: buffer.toString("base64"),
    });
  }

  const subject = `[ebay-catalog-bridge] Contact from ${session.shop}`;
  const text = [
    `Shop: ${session.shop}`,
    `From: ${name} <${email}>`,
    "",
    message,
  ].join("\n");

  const html = `
    <div>
      <p><strong>Shop:</strong> ${session.shop}</p>
      <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
      <hr />
      <pre style="white-space: pre-wrap; font-family: sans-serif;">${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: ["makiron19831014@gmail.com"],
      reply_to: email,
      subject,
      text,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    return Response.json(
      {
        error: `Failed to send message. ${errorText || resendResponse.status}`,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    message: "Your message has been sent.",
  });
};
