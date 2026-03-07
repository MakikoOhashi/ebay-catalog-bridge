import { useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

function pretty(data: unknown, empty = "No data yet.") {
  if (!data) return empty;
  return JSON.stringify(data, null, 2);
}

export default function SyncConsolePage() {
  const { shop } = useLoaderData<typeof loader>();
  const statusFetcher = useFetcher();
  const enqueueFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const conflictsFetcher = useFetcher();
  const errorsFetcher = useFetcher();
  const resolveConflictFetcher = useFetcher();
  const retryFetcher = useFetcher();
  const notifyTestFetcher = useFetcher();

  const statusJson = useMemo(
    () => pretty(statusFetcher.data, "No status loaded yet."),
    [statusFetcher.data],
  );
  const enqueueJson = useMemo(
    () => pretty(enqueueFetcher.data, "No enqueue request sent yet."),
    [enqueueFetcher.data],
  );
  const settingsJson = useMemo(
    () => pretty(settingsFetcher.data, "No settings loaded yet."),
    [settingsFetcher.data],
  );
  const conflictsJson = useMemo(
    () => pretty(conflictsFetcher.data, "No conflicts loaded yet."),
    [conflictsFetcher.data],
  );
  const errorsJson = useMemo(
    () => pretty(errorsFetcher.data, "No sync errors loaded yet."),
    [errorsFetcher.data],
  );
  const resolveJson = useMemo(
    () => pretty(resolveConflictFetcher.data, "No conflict resolution action yet."),
    [resolveConflictFetcher.data],
  );
  const retryJson = useMemo(
    () => pretty(retryFetcher.data, "No retry requested yet."),
    [retryFetcher.data],
  );
  const notifyJson = useMemo(
    () => pretty(notifyTestFetcher.data, "No notification test requested yet."),
    [notifyTestFetcher.data],
  );

  return (
    <s-page heading="Sync Console">
      <s-section heading="Quick Actions">
        <s-stack direction="inline" gap="base">
          <s-button
            href={`/api/ebay/oauth/start?label=primary&shop=${encodeURIComponent(shop)}`}
            target="_blank"
          >
            Connect eBay Account
          </s-button>
          <s-button
            onClick={() => statusFetcher.load("/api/sync/status")}
            {...(statusFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Refresh Sync Status
          </s-button>
          <s-button
            onClick={() => settingsFetcher.load("/api/settings")}
            {...(settingsFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Load Settings
          </s-button>
          <s-button
            onClick={() => conflictsFetcher.load("/api/conflicts")}
            {...(conflictsFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Load Conflicts
          </s-button>
          <s-button
            onClick={() => errorsFetcher.load("/api/sync/errors?limit=50")}
            {...(errorsFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Load Errors
          </s-button>
        </s-stack>
      </s-section>

      <s-section heading="Run Sync">
        <enqueueFetcher.Form method="post" action="/jobs/enqueue-sync">
          <input type="hidden" name="shop" value={shop} />
          <input type="hidden" name="mode" value="rolling" />
          <input type="hidden" name="fullScanComplete" value="false" />
          <label style={{ display: "grid", gap: 6 }}>
            <span>Items JSON (optional)</span>
            <textarea
              name="itemsJson"
              rows={8}
              defaultValue={`[
  {"sku":"SKU-001","itemId":"ITEM-001","lastModified":"2026-03-05T00:00:00Z"},
  {"sku":"SKU-002","itemId":"ITEM-002","lastModified":"2026-03-05T00:05:00Z"}
]`}
              style={{ minWidth: 420 }}
            />
          </label>
          <label style={{ display: "inline-flex", gap: 8 }}>
            <input type="checkbox" name="fullScanComplete" value="true" />
            <span>Force full scan complete (apply missing_on_ebay)</span>
          </label>
          <s-button
            type="submit"
            {...(enqueueFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Enqueue Core Sync
          </s-button>
        </enqueueFetcher.Form>
        <retryFetcher.Form method="post" action="/api/sync/retry">
          <s-button
            type="submit"
            {...(retryFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Retry Latest Run
          </s-button>
        </retryFetcher.Form>
        <notifyTestFetcher.Form method="post" action="/api/sync/notify-test">
          <s-button
            type="submit"
            {...(notifyTestFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Send Test Alert
          </s-button>
        </notifyTestFetcher.Form>
      </s-section>

      <s-section heading="Settings">
        <settingsFetcher.Form method="post" action="/api/settings">
          <s-stack direction="block" gap="base">
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>Sync Frequency (minutes)</span>
              <input type="number" min={5} name="syncFrequencyMinutes" defaultValue={30} />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>Sync Fields (comma separated)</span>
              <input
                type="text"
                name="syncFields"
                defaultValue="title,description,images,weight,stock,price"
              />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>Fixed FX Rate</span>
              <input type="number" name="fixedFxRate" step="0.01" defaultValue={150} />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>Round Rule</span>
              <input type="text" name="roundRule" defaultValue="nearest" />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>Error Notify Email</span>
              <input type="email" name="errorNotifyEmail" placeholder="ops@example.com" />
            </label>
            <label style={{ display: "inline-flex", gap: 8 }}>
              <input type="hidden" name="priceSyncEnabled" value="false" />
              <input type="checkbox" name="priceSyncEnabled" value="true" />
              <span>Enable Price Sync</span>
            </label>
            <s-button
              type="submit"
              {...(settingsFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Save Settings
            </s-button>
          </s-stack>
        </settingsFetcher.Form>
      </s-section>

      <s-section heading="Resolve Conflict">
        <resolveConflictFetcher.Form method="post" action="/api/conflicts">
          <s-stack direction="block" gap="base">
            <label style={{ display: "grid", gap: 4, maxWidth: 280 }}>
              <span>Conflict ID</span>
              <input type="number" name="conflictId" />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
              <span>Note</span>
              <input type="text" name="note" placeholder="resolved manually" />
            </label>
            <s-button
              type="submit"
              {...(resolveConflictFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Resolve Conflict
            </s-button>
          </s-stack>
        </resolveConflictFetcher.Form>
      </s-section>

      <s-section heading="Sync Status JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{statusJson}</pre>
        </s-box>
      </s-section>

      <s-section heading="Settings JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{settingsJson}</pre>
        </s-box>
      </s-section>

      <s-section heading="Conflicts JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{conflictsJson}</pre>
        </s-box>
      </s-section>

      <s-section heading="Sync Errors JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{errorsJson}</pre>
        </s-box>
      </s-section>

      <s-section heading="Actions JSON">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {`enqueue:\n${enqueueJson}\n\nretry:\n${retryJson}\n\nnotify_test:\n${notifyJson}\n\nresolve:\n${resolveJson}`}
          </pre>
        </s-box>
      </s-section>
    </s-page>
  );
}
