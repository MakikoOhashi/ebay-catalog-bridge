import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "connected";
  const accountId = url.searchParams.get("account_id");
  const shop = url.searchParams.get("shop");

  return {
    status,
    accountId,
    shop,
  };
};

export default function EbayOAuthDone() {
  const { status, accountId, shop } = useLoaderData<typeof loader>();
  const isSuccess = status === "connected";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f6f8fb",
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <section
        style={{
          background: "white",
          border: "1px solid #dfe3e8",
          borderRadius: 12,
          padding: 24,
          maxWidth: 560,
          width: "100%",
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          {isSuccess ? "eBay connection completed" : "eBay connection failed"}
        </h1>
        <p>
          {isSuccess
            ? "You can close this tab and return to the Shopify app."
            : "Please close this tab and retry from the Shopify app."}
        </p>
        {shop ? (
          <p>
            <strong>Shop:</strong> {shop}
          </p>
        ) : null}
        {accountId ? (
          <p>
            <strong>Connected account ID:</strong> {accountId}
          </p>
        ) : null}
      </section>
    </main>
  );
}
