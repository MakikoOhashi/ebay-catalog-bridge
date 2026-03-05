import { useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function SyncConsolePage() {
  const { shop } = useLoaderData<typeof loader>();
  const statusFetcher = useFetcher();
  const enqueueFetcher = useFetcher();

  const statusJson = useMemo(() => {
    if (!statusFetcher.data) return "No status loaded yet.";
    return JSON.stringify(statusFetcher.data, null, 2);
  }, [statusFetcher.data]);

  const enqueueJson = useMemo(() => {
    if (!enqueueFetcher.data) return "No enqueue request sent yet.";
    return JSON.stringify(enqueueFetcher.data, null, 2);
  }, [enqueueFetcher.data]);

  return (
    <s-page heading="Sync Console">
      <s-section heading="Phase 2 quick actions">
        <s-stack direction="inline" gap="base">
          <s-button
            onClick={() => statusFetcher.load("/api/sync/status")}
            {...(statusFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Refresh Sync Status
          </s-button>

          <enqueueFetcher.Form method="post" action="/jobs/enqueue-sync">
            <input type="hidden" name="shop" value={shop} />
            <input type="hidden" name="mode" value="rolling" />
            <s-button
              type="submit"
              {...(enqueueFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Enqueue Stub Sync
            </s-button>
          </enqueueFetcher.Form>
        </s-stack>
      </s-section>

      <s-section heading="Sync Status JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{statusJson}</pre>
        </s-box>
      </s-section>

      <s-section heading="Enqueue Result JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{enqueueJson}</pre>
        </s-box>
      </s-section>
    </s-page>
  );
}
