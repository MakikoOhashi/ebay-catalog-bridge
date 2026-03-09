import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndexPage() {
  return (
    <s-page heading="ebay-catalog-bridge">
      <s-section heading="Quick start">
        <s-paragraph>
          Open <s-link href="/app/sync">Sync Console</s-link> to run sync, check errors, and manage settings.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
