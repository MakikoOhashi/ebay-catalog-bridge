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
    quickActions: "画面更新",
    quickActionsDesc: "通常は下のセクションだけ見れば操作できます。困ったときだけ再読み込みしてください。",
    gettingStarted: "使い方",
    gettingStartedDesc: "この画面は 1. eBay接続 → 2. 設定保存 → 3. 同期実行 → 4. 結果確認 の順で使います。",
    step1: "1. eBayアカウントを接続する",
    step2: "2. 必要なら設定を保存する",
    step3: "3. 同期するアカウントを選んで同期する",
    step4: "4. 最新実行サマリーと商品一覧で結果を見る",
    connectEbay: "eBayアカウント接続",
    accountConnections: "eBayアカウント接続（最大4）",
    accountConnectionsDesc: "どのeBayアカウントをShopifyストアに紐づけるかを管理します。通常は商品を持っているアカウントだけ接続してください。",
    slot: "スロット",
    connect: "接続",
    disconnect: "解除",
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
    runSyncDesc: "普段はここだけ使えば大丈夫です。通常運用はcronで自動実行されますが、確認したいときはここから手動で実行できます。",
    itemsJson: "テスト用 Items JSON（任意）",
    itemsJsonHelp: "通常のeBay同期では空欄のままでOKです。手入力テストをしたいときだけ使います。",
    forceFullScan: "フルスキャン完了として扱う（missing_on_ebay適用）",
    forceFullScanHelp: "eBayで見つからなかったSKUを missing_on_ebay として扱いたいときだけ使います。通常はOFFのままでOKです。",
    enqueueSync: "この内容で同期する",
    retryLatest: "最新Runを再試行",
    sendTestAlert: "テスト通知送信",
    settings: "設定",
    settingsDesc: "普段はここで価格同期ON/OFFや為替レートを保存します。保存した内容は下の『現在の保存設定』に出ます。",
    syncFrequency: "同期頻度（分）",
    syncFields: "同期フィールド（カンマ区切り）",
    fixedFxRate: "固定為替レート",
    roundRule: "丸めルール",
    errorNotifyEmail: "通知メール",
    enablePriceSync: "価格同期を有効化",
    saveSettings: "設定保存",
    resolveConflict: "競合解消",
    resolveConflictDesc: "同じSKUが複数eBayアカウントにあるときだけ使います。普段は触らなくて大丈夫です。",
    conflictId: "競合ID",
    note: "メモ",
    resolve: "解消する",
    syncErrors: "同期エラー",
    syncErrorsDesc: "同期が失敗したときだけ使います。普段は見る必要はありません。",
    limit: "件数",
    runIdOptional: "Run ID（任意）",
    errorCodeOptional: "エラーコード（任意）",
    loadErrors: "エラーを読み込む",
    runHistory: "実行履歴",
    runHistoryDesc: "最近の同期が成功しているか、失敗していないかを確認する一覧です。",
    run: "Run",
    status: "状態",
    mode: "モード",
    debugData: "デバッグ情報",
    debugDataDesc: "開発・調査用の生データです。普段は開かなくて大丈夫です。",
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
    quickActions: "Refresh",
    quickActionsDesc: "In normal use, the sections below are enough. Use refresh only when the screen looks stale.",
    gettingStarted: "How To Use",
    gettingStartedDesc: "Use this screen in order: 1. Connect eBay, 2. Save settings, 3. Run sync, 4. Check results.",
    step1: "1. Connect your eBay account",
    step2: "2. Save settings if needed",
    step3: "3. Pick the account and run sync",
    step4: "4. Check the latest summary and product result",
    connectEbay: "Connect eBay Account",
    accountConnections: "eBay Account Connections (max 4)",
    accountConnectionsDesc: "Manage which eBay accounts are linked to this Shopify store. In normal use, only connect accounts that actually own products.",
    slot: "Slot",
    connect: "Connect",
    disconnect: "Disconnect",
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
    runSyncDesc: "This is the main area you will use. Cron handles normal operation, but you can run sync manually here when checking changes.",
    itemsJson: "Test Items JSON (optional)",
    itemsJsonHelp: "Leave this blank for normal eBay sync. Use it only when you want to test with manual input.",
    forceFullScan: "Force full scan complete (apply missing_on_ebay)",
    forceFullScanHelp: "Use this only when you want missing eBay SKUs to be marked as missing_on_ebay. Normally leave it off.",
    enqueueSync: "Run Sync Now",
    retryLatest: "Retry Latest Run",
    sendTestAlert: "Send Test Alert",
    settings: "Settings",
    settingsDesc: "Save pricing and sync options here. The saved result appears in 'Currently saved settings' below.",
    syncFrequency: "Sync Frequency (minutes)",
    syncFields: "Sync Fields (comma separated)",
    fixedFxRate: "Fixed FX Rate",
    roundRule: "Round Rule",
    errorNotifyEmail: "Error Notify Email",
    enablePriceSync: "Enable Price Sync",
    saveSettings: "Save Settings",
    resolveConflict: "Resolve Conflict",
    resolveConflictDesc: "Use this only when the same SKU exists in multiple eBay accounts. Most users can ignore it.",
    conflictId: "Conflict ID",
    note: "Note",
    resolve: "Resolve Conflict",
    syncErrors: "Sync Errors",
    syncErrorsDesc: "Use this only when a sync fails. You usually do not need it during normal use.",
    limit: "Limit",
    runIdOptional: "Run ID (optional)",
    errorCodeOptional: "Error Code (optional)",
    loadErrors: "Load Errors",
    runHistory: "Run History",
    runHistoryDesc: "A quick way to see whether recent syncs are succeeding or failing.",
    run: "Run",
    status: "Status",
    mode: "Mode",
    debugData: "Debug Data",
    debugDataDesc: "Raw developer-facing data. You usually do not need to open this.",
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

type SettingsResponsePayload = {
  shop: string;
  settings: {
    syncFrequencyMinutes: number;
    syncFields: string[];
    priceSyncEnabled: boolean;
    fixedFxRate: number;
    roundRule: string;
    errorNotifyEmail: string | null;
  };
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
  const settingsFetcher = useFetcher<SettingsResponsePayload>();
  const conflictsFetcher = useFetcher();
  const errorsFetcher = useFetcher();
  const resolveConflictFetcher = useFetcher();
  const retryFetcher = useFetcher();
  const notifyTestFetcher = useFetcher();
  const runsFetcher = useFetcher<SyncRunsPayload>();
  const disconnectFetcher = useFetcher();

  useEffect(() => {
    statusFetcher.load("/api/sync/status");
    runsFetcher.load("/api/sync/runs?limit=20");
    settingsFetcher.load("/api/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (disconnectFetcher.data && disconnectFetcher.state === "idle") {
      statusFetcher.load("/api/sync/status");
      runsFetcher.load("/api/sync/runs?limit=20");
      conflictsFetcher.load("/api/conflicts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disconnectFetcher.data, disconnectFetcher.state]);

  useEffect(() => {
    if (enqueueFetcher.data && enqueueFetcher.state === "idle") {
      statusFetcher.load("/api/sync/status");
      runsFetcher.load("/api/sync/runs?limit=20");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enqueueFetcher.data, enqueueFetcher.state]);

  useEffect(() => {
    if (retryFetcher.data && retryFetcher.state === "idle") {
      statusFetcher.load("/api/sync/status");
      runsFetcher.load("/api/sync/runs?limit=20");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryFetcher.data, retryFetcher.state]);

  useEffect(() => {
    if (resolveConflictFetcher.data && resolveConflictFetcher.state === "idle") {
      conflictsFetcher.load("/api/conflicts");
      statusFetcher.load("/api/sync/status");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveConflictFetcher.data, resolveConflictFetcher.state]);

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
  const currentSettings = settingsFetcher.data?.settings || null;
  const accountSlots = ["primary", "account-2", "account-3", "account-4"];

  const checkpointByLabel = new Map(checkpoints.map((c) => [c.label, c]));
  const refreshAll = () => {
    statusFetcher.load("/api/sync/status");
    runsFetcher.load("/api/sync/runs?limit=20");
    settingsFetcher.load("/api/settings");
    conflictsFetcher.load("/api/conflicts");
  };
  const activeConnectedCount = checkpoints.filter((checkpoint) => checkpoint.status === "connected").length;

  return (
    <s-page heading={t.pageHeading}>
      <s-section heading={t.gettingStarted}>
        <s-paragraph>{t.gettingStartedDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <div style={{ display: "grid", gap: 8 }}>
            <div>{t.step1}</div>
            <div>{t.step2}</div>
            <div>{t.step3}</div>
            <div>{t.step4}</div>
          </div>
        </s-box>
      </s-section>

      <s-section heading={t.quickActions}>
        <s-paragraph>{t.quickActionsDesc}</s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button variant={lang === "ja" ? "primary" : "secondary"} onClick={() => switchLang("ja")}>{t.japanese}</s-button>
          <s-button variant={lang === "en" ? "primary" : "secondary"} onClick={() => switchLang("en")}>{t.english}</s-button>
          <s-button onClick={refreshAll} {...(statusFetcher.state !== "idle" || runsFetcher.state !== "idle" || settingsFetcher.state !== "idle" ? { loading: true } : {})}>{t.refreshStatus}</s-button>
        </s-stack>
      </s-section>

      <s-section heading={t.accountConnections}>
        <s-paragraph>{t.accountConnectionsDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          {lang === "ja"
            ? `現在の接続数: ${activeConnectedCount} / 4`
            : `Connected now: ${activeConnectedCount} / 4`}
        </s-box>
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
                  {isConnected && checkpoint?.ebayAccountId ? (
                    <disconnectFetcher.Form method="post" action="/api/ebay/account/disconnect">
                      <input type="hidden" name="accountId" value={checkpoint.ebayAccountId} />
                      <s-button
                        type="submit"
                        variant="secondary"
                        {...(disconnectFetcher.state !== "idle" ? { loading: true } : {})}
                      >
                        {t.disconnect}
                      </s-button>
                    </disconnectFetcher.Form>
                  ) : null}
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
            <small>{t.itemsJsonHelp}</small>
          </label>
          <label style={{ display: "inline-flex", gap: 8 }}>
            <input type="checkbox" name="fullScanComplete" value="true" />
            <span>{t.forceFullScan}</span>
          </label>
          <small>{t.forceFullScanHelp}</small>
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
        {currentSettings ? (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <strong>{lang === "ja" ? "現在の保存設定" : "Currently saved settings"}</strong>
            <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
              <div>{t.syncFrequency}: {currentSettings.syncFrequencyMinutes}</div>
              <div>{t.syncFields}: {currentSettings.syncFields.join(", ")}</div>
              <div>{t.fixedFxRate}: {currentSettings.fixedFxRate}</div>
              <div>{t.roundRule}: {currentSettings.roundRule}</div>
              <div>{t.enablePriceSync}: {currentSettings.priceSyncEnabled ? "ON" : "OFF"}</div>
              <div>{t.errorNotifyEmail}: {currentSettings.errorNotifyEmail || "-"}</div>
            </div>
          </s-box>
        ) : null}
        <settingsFetcher.Form method="post" action="/api/settings">
          <s-stack direction="block" gap="base">
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.syncFrequency}</span>
              <input
                type="number"
                min={5}
                name="syncFrequencyMinutes"
                defaultValue={currentSettings?.syncFrequencyMinutes ?? 30}
              />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.syncFields}</span>
              <input
                type="text"
                name="syncFields"
                defaultValue={
                  currentSettings?.syncFields?.join(",") ||
                  "title,description,images,weight,stock,price"
                }
              />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.fixedFxRate}</span>
              <input
                type="number"
                name="fixedFxRate"
                step="0.01"
                defaultValue={currentSettings?.fixedFxRate ?? 150}
              />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.roundRule}</span>
              <input
                type="text"
                name="roundRule"
                defaultValue={currentSettings?.roundRule ?? "nearest"}
              />
            </label>
            <label style={{ display: "grid", gap: 4, maxWidth: 360 }}>
              <span>{t.errorNotifyEmail}</span>
              <input
                type="email"
                name="errorNotifyEmail"
                placeholder="ops@example.com"
                defaultValue={currentSettings?.errorNotifyEmail ?? ""}
              />
            </label>
            <label style={{ display: "inline-flex", gap: 8 }}>
              <input type="hidden" name="priceSyncEnabled" value="false" />
              <input
                type="checkbox"
                name="priceSyncEnabled"
                value="true"
                defaultChecked={currentSettings?.priceSyncEnabled ?? false}
              />
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

      <s-section heading={t.debugData}>
        <s-paragraph>{t.debugDataDesc}</s-paragraph>
        <details>
          <summary>{t.syncStatusJson}</summary>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{statusJson}</pre>
          </s-box>
        </details>
        <details>
          <summary>{t.settingsJson}</summary>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{settingsJson}</pre>
          </s-box>
        </details>
        <details>
          <summary>{t.conflictsJson}</summary>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{conflictsJson}</pre>
          </s-box>
        </details>
        <details>
          <summary>{t.syncErrorsJson}</summary>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{errorsJson}</pre>
          </s-box>
        </details>
        <details>
          <summary>{t.actionsJson}</summary>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {`enqueue:\n${enqueueJson}\n\nretry:\n${retryJson}\n\nnotify_test:\n${notifyJson}\n\nresolve:\n${resolveJson}`}
            </pre>
          </s-box>
        </details>
      </s-section>
    </s-page>
  );
}
