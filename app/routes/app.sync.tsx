import { useEffect, useMemo, useState } from "react";
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

type Lang = "ja" | "en";

const textMap = {
  ja: {
    pageHeading: "同期コンソール",
    quickActions: "クイック操作",
    quickActionsDesc: "全体データの再読み込みや初期接続を行います。",
    connectEbay: "eBayアカウント接続",
    accountConnections: "eBayアカウント接続（最大4）",
    slot: "スロット",
    connect: "接続",
    connected: "接続済み",
    notConnected: "未接続",
    syncAccount: "同期対象アカウント",
    autoFirstConnected: "自動（最初の接続済み）",
    refreshStatus: "同期ステータス更新",
    loadRunHistory: "実行履歴を読み込む",
    loadSettings: "設定を読み込む",
    loadConflicts: "競合を読み込む",
    latestSummary: "最新実行サマリー",
    latestSummaryDesc: "直近1回の同期結果を要点だけ表示します。",
    runId: "実行ID",
    started: "開始",
    processed: "処理",
    created: "作成",
    updated: "更新",
    skipped: "スキップ",
    conflicts: "競合",
    missing: "欠損",
    errors: "エラー",
    runSync: "同期実行",
    runSyncDesc: "手動で同期ジョブを実行します。通常運用はcronで自動実行されます。",
    itemsJson: "Items JSON（任意）",
    forceFullScan: "フルスキャン完了として扱う（missing_on_ebay適用）",
    enqueueSync: "同期ジョブ投入",
    retryLatest: "最新Runを再試行",
    sendTestAlert: "テスト通知送信",
    settings: "設定",
    settingsDesc: "同期頻度・対象項目・価格設定などを保存します。",
    syncFrequency: "同期頻度（分）",
    syncFields: "同期フィールド（カンマ区切り）",
    fixedFxRate: "固定為替レート",
    roundRule: "丸めルール",
    errorNotifyEmail: "通知メール",
    enablePriceSync: "価格同期を有効化",
    saveSettings: "設定保存",
    resolveConflict: "競合解消",
    resolveConflictDesc: "SKU競合を手動で解消して再開できる状態にします。",
    conflictId: "競合ID",
    note: "メモ",
    resolve: "解消する",
    syncErrors: "同期エラー",
    syncErrorsDesc: "run単位でエラーを絞り込み確認します。",
    limit: "件数",
    runIdOptional: "Run ID（任意）",
    errorCodeOptional: "エラーコード（任意）",
    loadErrors: "エラーを読み込む",
    runHistory: "実行履歴",
    runHistoryDesc: "過去runの推移を時系列で確認します。",
    run: "Run",
    status: "状態",
    mode: "モード",
    syncStatusJson: "同期ステータスJSON",
    syncStatusJsonDesc: "状態APIの生データです（デバッグ向け）。",
    settingsJson: "設定JSON",
    settingsJsonDesc: "設定APIの生データです（デバッグ向け）。",
    conflictsJson: "競合JSON",
    conflictsJsonDesc: "競合APIの生データです（デバッグ向け）。",
    syncErrorsJson: "同期エラーJSON",
    syncErrorsJsonDesc: "エラーAPIの生データです（デバッグ向け）。",
    actionsJson: "操作JSON",
    actionsJsonDesc: "直近アクションのレスポンスです（デバッグ向け）。",
    noStatusLoaded: "ステータス未読み込み",
    noEnqueueRequested: "enqueue未実行",
    noSettingsLoaded: "設定未読み込み",
    noConflictsLoaded: "競合未読み込み",
    noErrorsLoaded: "エラー未読み込み",
    noResolveAction: "競合解消未実行",
    noRetryRequested: "再試行未実行",
    noNotifyRequested: "通知テスト未実行",
    noRunHistoryLoaded: "履歴未読み込み",
    unknown: "不明",
    japanese: "日本語",
    english: "English",
  },
  en: {
    pageHeading: "Sync Console",
    quickActions: "Quick Actions",
    quickActionsDesc: "Refresh overall data and perform initial connection actions.",
    connectEbay: "Connect eBay Account",
    accountConnections: "eBay Account Connections (max 4)",
    slot: "Slot",
    connect: "Connect",
    connected: "Connected",
    notConnected: "Not connected",
    syncAccount: "Sync Account",
    autoFirstConnected: "Auto (first connected)",
    refreshStatus: "Refresh Sync Status",
    loadRunHistory: "Load Run History",
    loadSettings: "Load Settings",
    loadConflicts: "Load Conflicts",
    latestSummary: "Latest Run Summary",
    latestSummaryDesc: "Shows key metrics from the latest sync run.",
    runId: "Run ID",
    started: "Started",
    processed: "Processed",
    created: "Created",
    updated: "Updated",
    skipped: "Skipped",
    conflicts: "Conflicts",
    missing: "Missing",
    errors: "Errors",
    runSync: "Run Sync",
    runSyncDesc: "Run sync manually. In normal operation, cron runs this automatically.",
    itemsJson: "Items JSON (optional)",
    forceFullScan: "Force full scan complete (apply missing_on_ebay)",
    enqueueSync: "Enqueue Core Sync",
    retryLatest: "Retry Latest Run",
    sendTestAlert: "Send Test Alert",
    settings: "Settings",
    settingsDesc: "Save sync frequency, fields, and pricing options.",
    syncFrequency: "Sync Frequency (minutes)",
    syncFields: "Sync Fields (comma separated)",
    fixedFxRate: "Fixed FX Rate",
    roundRule: "Round Rule",
    errorNotifyEmail: "Error Notify Email",
    enablePriceSync: "Enable Price Sync",
    saveSettings: "Save Settings",
    resolveConflict: "Resolve Conflict",
    resolveConflictDesc: "Resolve SKU conflicts manually so syncing can continue.",
    conflictId: "Conflict ID",
    note: "Note",
    resolve: "Resolve Conflict",
    syncErrors: "Sync Errors",
    syncErrorsDesc: "Filter and inspect sync errors by run.",
    limit: "Limit",
    runIdOptional: "Run ID (optional)",
    errorCodeOptional: "Error Code (optional)",
    loadErrors: "Load Errors",
    runHistory: "Run History",
    runHistoryDesc: "View historical run trends in chronological order.",
    run: "Run",
    status: "Status",
    mode: "Mode",
    syncStatusJson: "Sync Status JSON",
    syncStatusJsonDesc: "Raw status API response (for debugging).",
    settingsJson: "Settings JSON",
    settingsJsonDesc: "Raw settings API response (for debugging).",
    conflictsJson: "Conflicts JSON",
    conflictsJsonDesc: "Raw conflicts API response (for debugging).",
    syncErrorsJson: "Sync Errors JSON",
    syncErrorsJsonDesc: "Raw errors API response (for debugging).",
    actionsJson: "Actions JSON",
    actionsJsonDesc: "Latest action responses (for debugging).",
    noStatusLoaded: "No status loaded yet.",
    noEnqueueRequested: "No enqueue request sent yet.",
    noSettingsLoaded: "No settings loaded yet.",
    noConflictsLoaded: "No conflicts loaded yet.",
    noErrorsLoaded: "No sync errors loaded yet.",
    noResolveAction: "No conflict resolution action yet.",
    noRetryRequested: "No retry requested yet.",
    noNotifyRequested: "No notification test requested yet.",
    noRunHistoryLoaded: "No run history loaded yet.",
    unknown: "unknown",
    japanese: "日本語",
    english: "English",
  },
} as const;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusTone(status?: string | null) {
  if (!status) return "neutral";
  if (status === "succeeded") return "success";
  if (status === "partial") return "warning";
  if (status === "failed") return "critical";
  return "neutral";
}

type SyncStatusPayload = {
  latestRun?: {
    id: number;
    status: string;
    mode: string;
    ebayAccountId?: number | null;
    startedAt: string;
    endedAt: string | null;
    totalItems: number;
    processedItems: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    conflictCount: number;
    missingCount: number;
    errorCount: number;
    message: string | null;
  } | null;
  checkpoints?: Array<{
    ebayAccountId: number;
    label: string;
    status: string;
  }>;
};

type SyncRunsPayload = {
  runs?: Array<{
    id: number;
    status: string;
    mode: string;
    startedAt: string;
    processedItems: number;
    totalItems: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    missingCount: number;
    conflictCount: number;
  }>;
};

export default function SyncConsolePage() {
  const { shop } = useLoaderData<typeof loader>();
  const [lang, setLang] = useState<Lang>("ja");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("syncConsoleLang") : null;
    if (saved === "ja" || saved === "en") {
      setLang(saved);
    }
  }, []);

  const t = textMap[lang];

  const switchLang = (next: Lang) => {
    setLang(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("syncConsoleLang", next);
    }
  };

  const statusFetcher = useFetcher<SyncStatusPayload>();
  const enqueueFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const conflictsFetcher = useFetcher();
  const errorsFetcher = useFetcher();
  const resolveConflictFetcher = useFetcher();
  const retryFetcher = useFetcher();
  const notifyTestFetcher = useFetcher();
  const runsFetcher = useFetcher<SyncRunsPayload>();

  useEffect(() => {
    statusFetcher.load("/api/sync/status");
    runsFetcher.load("/api/sync/runs?limit=20");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusJson = useMemo(() => pretty(statusFetcher.data, t.noStatusLoaded), [statusFetcher.data, t.noStatusLoaded]);
  const enqueueJson = useMemo(() => pretty(enqueueFetcher.data, t.noEnqueueRequested), [enqueueFetcher.data, t.noEnqueueRequested]);
  const settingsJson = useMemo(() => pretty(settingsFetcher.data, t.noSettingsLoaded), [settingsFetcher.data, t.noSettingsLoaded]);
  const conflictsJson = useMemo(() => pretty(conflictsFetcher.data, t.noConflictsLoaded), [conflictsFetcher.data, t.noConflictsLoaded]);
  const errorsJson = useMemo(() => pretty(errorsFetcher.data, t.noErrorsLoaded), [errorsFetcher.data, t.noErrorsLoaded]);
  const resolveJson = useMemo(() => pretty(resolveConflictFetcher.data, t.noResolveAction), [resolveConflictFetcher.data, t.noResolveAction]);
  const retryJson = useMemo(() => pretty(retryFetcher.data, t.noRetryRequested), [retryFetcher.data, t.noRetryRequested]);
  const notifyJson = useMemo(() => pretty(notifyTestFetcher.data, t.noNotifyRequested), [notifyTestFetcher.data, t.noNotifyRequested]);
  const runsJson = useMemo(() => pretty(runsFetcher.data, t.noRunHistoryLoaded), [runsFetcher.data, t.noRunHistoryLoaded]);

  const latestRun = statusFetcher.data?.latestRun || null;
  const runs = runsFetcher.data?.runs || [];
  const checkpoints = statusFetcher.data?.checkpoints || [];
  const accountSlots = ["primary", "account-2", "account-3", "account-4"];

  const checkpointByLabel = new Map(checkpoints.map((c) => [c.label, c]));

  return (
    <s-page heading={t.pageHeading}>
      <s-section heading={t.quickActions}>
        <s-paragraph>{t.quickActionsDesc}</s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button variant={lang === "ja" ? "primary" : "secondary"} onClick={() => switchLang("ja")}>{t.japanese}</s-button>
          <s-button variant={lang === "en" ? "primary" : "secondary"} onClick={() => switchLang("en")}>{t.english}</s-button>
          <s-button onClick={() => statusFetcher.load("/api/sync/status")} {...(statusFetcher.state !== "idle" ? { loading: true } : {})}>{t.refreshStatus}</s-button>
          <s-button onClick={() => runsFetcher.load("/api/sync/runs?limit=20")} {...(runsFetcher.state !== "idle" ? { loading: true } : {})}>{t.loadRunHistory}</s-button>
          <s-button onClick={() => settingsFetcher.load("/api/settings")} {...(settingsFetcher.state !== "idle" ? { loading: true } : {})}>{t.loadSettings}</s-button>
          <s-button onClick={() => conflictsFetcher.load("/api/conflicts")} {...(conflictsFetcher.state !== "idle" ? { loading: true } : {})}>{t.loadConflicts}</s-button>
        </s-stack>
      </s-section>

      <s-section heading={t.accountConnections}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {accountSlots.map((slotLabel, index) => {
            const checkpoint = checkpointByLabel.get(slotLabel);
            const isConnected = checkpoint?.status === "connected";
            return (
              <s-box key={slotLabel} borderWidth="base" borderRadius="base" padding="base">
                <s-stack direction="block" gap="base">
                  <span>{t.slot} {index + 1}: {slotLabel}</span>
                  <s-badge tone={isConnected ? "success" : "neutral"}>
                    {isConnected
                      ? `${t.connected} (#${checkpoint?.ebayAccountId})`
                      : t.notConnected}
                  </s-badge>
                  <s-button
                    href={`/api/ebay/oauth/start?label=${encodeURIComponent(slotLabel)}&shop=${encodeURIComponent(shop)}${checkpoint?.ebayAccountId ? `&accountId=${checkpoint.ebayAccountId}` : ""}`}
                    target="_blank"
                  >
                    {t.connect}
                  </s-button>
                </s-stack>
              </s-box>
            );
          })}
        </div>
      </s-section>

      <s-section heading={t.latestSummary}>
        <s-paragraph>{t.latestSummaryDesc}</s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-badge tone={statusTone(latestRun?.status)}>{latestRun?.status || t.unknown}</s-badge>
          <span>{t.runId}: {latestRun?.id ?? "-"}</span>
          <span>{t.syncAccount}: {latestRun?.ebayAccountId ?? "-"}</span>
          <span>{t.started}: {formatDate(latestRun?.startedAt)}</span>
          <span>{t.processed}: {latestRun ? `${latestRun.processedItems}/${latestRun.totalItems}` : "-"}</span>
        </s-stack>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginTop: 12 }}>
          <s-box borderWidth="base" borderRadius="base" padding="base">{t.created}: {latestRun?.createdCount ?? 0}</s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">{t.updated}: {latestRun?.updatedCount ?? 0}</s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">{t.skipped}: {latestRun?.skippedCount ?? 0}</s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">{t.conflicts}: {latestRun?.conflictCount ?? 0}</s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">{t.missing}: {latestRun?.missingCount ?? 0}</s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">{t.errors}: {latestRun?.errorCount ?? 0}</s-box>
        </div>
      </s-section>

      <s-section heading={t.runSync}>
        <s-paragraph>{t.runSyncDesc}</s-paragraph>
        <enqueueFetcher.Form method="post" action="/jobs/enqueue-sync">
          <input type="hidden" name="shop" value={shop} />
          <input type="hidden" name="mode" value="rolling" />
          <input type="hidden" name="fullScanComplete" value="false" />
          <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
            <span>{t.syncAccount}</span>
            <select name="ebayAccountId" defaultValue="">
              <option value="">{t.autoFirstConnected}</option>
              {checkpoints.map((checkpoint) => (
                <option key={checkpoint.ebayAccountId} value={checkpoint.ebayAccountId}>
                  #{checkpoint.ebayAccountId} ({checkpoint.label}) - {checkpoint.status}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t.itemsJson}</span>
            <textarea
              name="itemsJson"
              rows={8}
              defaultValue={`[\n  {"sku":"SKU-001","itemId":"ITEM-001","lastModified":"2026-03-05T00:00:00Z"},\n  {"sku":"SKU-002","itemId":"ITEM-002","lastModified":"2026-03-05T00:05:00Z"}\n]`}
              style={{ minWidth: 420 }}
            />
          </label>
          <label style={{ display: "inline-flex", gap: 8 }}>
            <input type="checkbox" name="fullScanComplete" value="true" />
            <span>{t.forceFullScan}</span>
          </label>
          <s-button type="submit" {...(enqueueFetcher.state !== "idle" ? { loading: true } : {})}>{t.enqueueSync}</s-button>
        </enqueueFetcher.Form>
        <retryFetcher.Form method="post" action="/api/sync/retry">
          <s-button type="submit" {...(retryFetcher.state !== "idle" ? { loading: true } : {})}>{t.retryLatest}</s-button>
        </retryFetcher.Form>
        <notifyTestFetcher.Form method="post" action="/api/sync/notify-test">
          <s-button type="submit" {...(notifyTestFetcher.state !== "idle" ? { loading: true } : {})}>{t.sendTestAlert}</s-button>
        </notifyTestFetcher.Form>
      </s-section>

      <s-section heading={t.settings}>
        <s-paragraph>{t.settingsDesc}</s-paragraph>
        <settingsFetcher.Form method="post" action="/api/settings">
          <s-stack direction="block" gap="base">
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.syncFrequency}</span>
              <input type="number" min={5} name="syncFrequencyMinutes" defaultValue={30} />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.syncFields}</span>
              <input type="text" name="syncFields" defaultValue="title,description,images,weight,stock,price" />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.fixedFxRate}</span>
              <input type="number" name="fixedFxRate" step="0.01" defaultValue={150} />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.roundRule}</span>
              <input type="text" name="roundRule" defaultValue="nearest" />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.errorNotifyEmail}</span>
              <input type="email" name="errorNotifyEmail" placeholder="ops@example.com" />
            </label>
            <label style={{ display: "inline-flex", gap: 8 }}>
              <input type="hidden" name="priceSyncEnabled" value="false" />
              <input type="checkbox" name="priceSyncEnabled" value="true" />
              <span>{t.enablePriceSync}</span>
            </label>
            <s-button type="submit" {...(settingsFetcher.state !== "idle" ? { loading: true } : {})}>{t.saveSettings}</s-button>
          </s-stack>
        </settingsFetcher.Form>
      </s-section>

      <s-section heading={t.resolveConflict}>
        <s-paragraph>{t.resolveConflictDesc}</s-paragraph>
        <resolveConflictFetcher.Form method="post" action="/api/conflicts">
          <s-stack direction="block" gap="base">
            <label style={{ display: "grid", gap: 4, maxWidth: 280 }}>
              <span>{t.conflictId}</span>
              <input type="number" name="conflictId" />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
              <span>{t.note}</span>
              <input type="text" name="note" placeholder="resolved manually" />
            </label>
            <s-button type="submit" {...(resolveConflictFetcher.state !== "idle" ? { loading: true } : {})}>{t.resolve}</s-button>
          </s-stack>
        </resolveConflictFetcher.Form>
      </s-section>

      <s-section heading={t.syncErrors}>
        <s-paragraph>{t.syncErrorsDesc}</s-paragraph>
        <errorsFetcher.Form method="get" action="/api/sync/errors">
          <s-stack direction="inline" gap="base">
            <label style={{ display: "grid", gap: 4 }}>
              <span>{t.limit}</span>
              <input type="number" name="limit" defaultValue={50} min={1} max={200} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span>{t.runIdOptional}</span>
              <input type="number" name="runId" placeholder="latest" />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span>{t.errorCodeOptional}</span>
              <input type="text" name="errorCode" placeholder="EBAY_FETCH_ERROR" />
            </label>
            <s-button type="submit" {...(errorsFetcher.state !== "idle" ? { loading: true } : {})}>{t.loadErrors}</s-button>
          </s-stack>
        </errorsFetcher.Form>
      </s-section>

      <s-section heading={t.runHistory}>
        <s-paragraph>{t.runHistoryDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          {runs.length === 0 ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{runsJson}</pre>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">{t.run}</th>
                    <th align="left">{t.status}</th>
                    <th align="left">{t.mode}</th>
                    <th align="left">{t.started}</th>
                    <th align="left">{t.processed}</th>
                    <th align="left">{t.created}</th>
                    <th align="left">{t.updated}</th>
                    <th align="left">{t.errors}</th>
                    <th align="left">{t.missing}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>{run.id}</td>
                      <td>{run.status}</td>
                      <td>{run.mode}</td>
                      <td>{formatDate(run.startedAt)}</td>
                      <td>{`${run.processedItems}/${run.totalItems}`}</td>
                      <td>{run.createdCount}</td>
                      <td>{run.updatedCount}</td>
                      <td>{run.errorCount}</td>
                      <td>{run.missingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </s-box>
      </s-section>

      <s-section heading={t.syncStatusJson}>
        <s-paragraph>{t.syncStatusJsonDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{statusJson}</pre>
        </s-box>
      </s-section>

      <s-section heading={t.settingsJson}>
        <s-paragraph>{t.settingsJsonDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{settingsJson}</pre>
        </s-box>
      </s-section>

      <s-section heading={t.conflictsJson}>
        <s-paragraph>{t.conflictsJsonDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{conflictsJson}</pre>
        </s-box>
      </s-section>

      <s-section heading={t.syncErrorsJson}>
        <s-paragraph>{t.syncErrorsJsonDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{errorsJson}</pre>
        </s-box>
      </s-section>

      <s-section heading={t.actionsJson}>
        <s-paragraph>{t.actionsJsonDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {`enqueue:\n${enqueueJson}\n\nretry:\n${retryJson}\n\nnotify_test:\n${notifyJson}\n\nresolve:\n${resolveJson}`}
          </pre>
        </s-box>
      </s-section>
    </s-page>
  );
}
