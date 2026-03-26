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
    quickActions: "表示",
    quickActionsDesc: "ここでは表示言語だけ切り替えられます。",
    gettingStarted: "使い方",
    gettingStartedDesc: "この画面は 1. eBay接続 → 2. 設定保存 → 3. 同期実行 → 4. 結果確認 の順で使います。",
    step1: "1. eBayアカウントを接続する",
    step2: "2. 必要なら設定を保存する",
    step3: "3. 同期するアカウントを選んで同期する",
    step4: "4. 最新実行サマリーと商品一覧で結果を見る",
    connectEbay: "eBayアカウント接続",
    accountConnections: "eBayアカウント接続（最大4）",
    accountConnectionsDesc: "どのeBayアカウントをShopifyストアに紐づけるかを管理します。通常は商品を持っているアカウントだけ接続してください。同期された商品には、eBay ID のタグが自動で付きます。",
    syncDirectionTitle: "同期方向",
    syncDirectionLead: "eBay → Shopify",
    syncDirectionDesc: "Shopify → eBay はしません",
    skuSyncRuleTitle: "同期の基準",
    skuSyncRuleLead: "SKU で同期",
    skuSyncRuleDesc: "同じSKUが別アカウントにある場合は競合で停止します",
    slot: "スロット",
    connect: "接続",
    disconnect: "解除",
    connected: "接続済み",
    notConnected: "未接続",
    syncAccount: "同期対象アカウント",
    selectAccountPlaceholder: "アカウントを選んでください",
    selectManualAccounts: "手動同期するアカウント",
    manualSyncTargetsHelp: "必要なアカウントだけチェックして同期できます。複数選択も可能です。",
    refreshStatus: "接続状態を更新",
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
    runSync: "手動同期",
    runSyncDesc: "自動同期は夜間に1回だけ実行されます。日中に確認したいときだけ、ここから手動で同期できます。",
    manualSyncButton: "選んだアカウントを同期する",
    manualSyncRunning: "手動同期を実行中です...",
    manualSyncNoSelection: "手動同期するアカウントを1つ以上選んでください。",
    reflectTestAccount: "テストに使うアカウント",
    reflectTestRun: "反映テストを実行",
    reflectTest: "反映テスト（任意）",
    reflectTestDesc: "入力した商品をテスト用に追加して、反映される内容を確認できます。確認用の機能なので、本番データをそのまま登録するものではありません。",
    reflectTestEmpty: "通常のeBay同期では、この入力は空欄のままでOKです。",
    testItem: "テスト商品",
    sku: "SKU",
    itemId: "Item ID",
    lastModified: "更新日時",
    addTestItem: "テスト商品を追加",
    removeTestItem: "この商品を削除",
    advancedJson: "高度な入力（JSONを直接編集）",
    advancedJsonDesc: "通常は使いません。必要なときだけJSONを直接入力できます。",
    forceFullScan: "見つからなかった商品を売り切れにする",
    forceFullScanHelp: "選んだ eBay アカウントで、前回はあったのに今回の同期で見つからなかった商品を、Shopifyで在庫0・売り切れにします。",
    accountIdFallbackNote: "eBay ID がまだ表示されない場合は、そのアカウントを一度つなぎ直すと反映されます。",
    enqueueSync: "この内容で同期する",
    retryLatest: "最新Runを再試行",
    sendTestAlert: "テスト通知送信",
    settings: "設定",
    settingsDesc: "ここでは自動同期バッチの頻度や価格設定を保存します。保存した内容は下の『現在の保存設定』に出ます。",
    settingsOpsNote: "このアプリは少しずつ巡回するバッチ同期を前提にしています。安定運用の目安として、Shopifyストアの総SKU数は 49,000 件以下を推奨します。",
    syncFrequency: "自動同期バッチ",
    nightlyBatch: "毎日1回（夜間）",
    syncFields: "同期フィールド",
    syncFieldsHelp: "同期したい項目だけチェックしてください。",
    weightSyncNote: "重量運用メモ",
    weightSyncNoteDesc: "重量ベース送料を使う場合は、eBay側の重量を「梱包込みの実発送重量」で統一し、Shopifyのデフォルトパッケージ重量は 0 に設定してください。そうすると、同期した重量をそのまま送料計算に使えます。",
    fieldTitle: "商品名",
    fieldDescription: "説明文",
    fieldImages: "画像",
    fieldWeight: "重量",
    fieldStock: "在庫",
    fixedFxRate: "固定為替レート",
    fxRateMode: "為替レート方式",
    fxModeFixed: "固定レート",
    fxModeAuto: "自動取得（Frankfurter）",
    fxModeHelp: "自動取得では、USD から Shopifyストア通貨へのレートを自動同期バッチのタイミングで更新します。次の更新までは前回取得したレートを使います。",
    fxModeCurrentPair: "現在の自動換算",
    priceAdjustmentPercent: "価格調整（%）",
    priceAdjustmentFixed: "価格調整（固定額）",
    priceAdjustmentPercentHelp: "eBay価格に対して、Shopifyストア価格を調整します。10 で 10%増額、-10 で 10%減額です。",
    priceAdjustmentFixedHelp: "eBay価格を換算した後、Shopifyストア通貨で加減算します。300 で +300、-300 で -300 です。",
    autoFxPair: "変換通貨",
    autoFxLastRate: "現在使用中のレート",
    autoFxLastFetchedAt: "前回取得日時",
    roundRule: "丸めルール",
    roundNearest: "四捨五入",
    roundUp: "切り上げ",
    roundDown: "切り捨て",
    slackNotifyWebhookUrl: "Slack通知Webhook URL",
    slackNotifyWebhookUrlHelp: "このストア専用のSlack Incoming Webhook URLを設定すると、同期エラー時の通知とテスト通知がこのストアのSlackに届きます。",
    slackNotifyWebhookUrlHowTo: "Slack管理画面で Incoming Webhooks を追加すると取得できます。",
    slackNotifyWebhookUrlHelpLink: "Slackヘルプ",
    enablePriceSync: "価格同期を有効化",
    saveSettings: "設定保存",
    resolveConflict: "運用者向け: 競合解消",
    resolveConflictDesc: "同じSKUが複数eBayアカウントにあるときだけ使います。通常は閉じたままで大丈夫です。",
    conflictId: "競合ID",
    note: "メモ",
    resolve: "解消する",
    syncErrors: "同期エラー",
    syncErrorsDesc: "同期が失敗したときだけ使います。普段は見る必要はありません。",
    limit: "件数",
    runIdOptional: "Run ID（任意）",
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
    itemDebug: "SKUデバッグ",
    itemDebugDesc: "指定したeBayアカウントIDとSKUについて、eBayの生レスポンスと重量情報を確認します。",
    itemDebugAccountId: "eBayアカウントID",
    itemDebugSku: "SKU",
    itemDebugLoad: "SKUデバッグを読み込む",
    itemDebugJson: "SKUデバッグJSON",
    noStatusLoaded: "ステータス未読み込み",
    noEnqueueRequested: "enqueue未実行",
    noSettingsLoaded: "設定未読み込み",
    noConflictsLoaded: "競合未読み込み",
    noErrorsLoaded: "エラー未読み込み",
    noResolveAction: "競合解消未実行",
    noRetryRequested: "再試行未実行",
    noNotifyRequested: "通知テスト未実行",
    noItemDebugLoaded: "SKUデバッグ未読み込み",
    noRunHistoryLoaded: "履歴未読み込み",
    unknown: "不明",
    japanese: "日本語",
    english: "English",
  },
  en: {
    pageHeading: "Sync Console",
    quickActions: "Display",
    quickActionsDesc: "Use this area only to switch the display language.",
    gettingStarted: "How To Use",
    gettingStartedDesc: "Use this screen in order: 1. Connect eBay, 2. Save settings, 3. Run sync, 4. Check results.",
    step1: "1. Connect your eBay account",
    step2: "2. Save settings if needed",
    step3: "3. Pick the account and run sync",
    step4: "4. Check the latest summary and product result",
    connectEbay: "Connect eBay Account",
    accountConnections: "eBay Account Connections (max 4)",
    accountConnectionsDesc: "Manage which eBay accounts are linked to this Shopify store. In normal use, only connect accounts that actually own products. Synced products automatically receive an eBay ID tag.",
    syncDirectionTitle: "Sync direction",
    syncDirectionLead: "eBay → Shopify",
    syncDirectionDesc: "Shopify → eBay is not supported",
    skuSyncRuleTitle: "Sync key",
    skuSyncRuleLead: "Sync by SKU",
    skuSyncRuleDesc: "If the same SKU appears in another account, it stops as a conflict",
    slot: "Slot",
    connect: "Connect",
    disconnect: "Disconnect",
    connected: "Connected",
    notConnected: "Not connected",
    syncAccount: "Sync Account",
    selectAccountPlaceholder: "Select an account",
    selectManualAccounts: "Accounts To Sync Manually",
    manualSyncTargetsHelp: "Check only the accounts you want to sync. Multiple selection is supported.",
    refreshStatus: "Refresh Connection Status",
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
    runSync: "Manual Sync",
    runSyncDesc: "Automatic sync runs once during the night. Use this section only when you want to run a manual sync during the day.",
    manualSyncButton: "Sync Selected Accounts",
    manualSyncRunning: "Running manual sync...",
    manualSyncNoSelection: "Select at least one account for manual sync.",
    reflectTestAccount: "Account For Test Sync",
    reflectTestRun: "Run Reflection Test",
    reflectTest: "Reflection Test (optional)",
    reflectTestDesc: "You can add test products here to preview how they would sync. This is for testing only and does not directly register production data.",
    reflectTestEmpty: "For normal eBay sync, leave this section empty.",
    testItem: "Test Item",
    sku: "SKU",
    itemId: "Item ID",
    lastModified: "Last Modified",
    addTestItem: "Add Test Item",
    removeTestItem: "Remove This Item",
    advancedJson: "Advanced Input (edit JSON directly)",
    advancedJsonDesc: "You usually do not need this. Use only when you want to enter raw JSON manually.",
    forceFullScan: "Mark missing products as sold out",
    forceFullScanHelp: "For the selected eBay account only, products that were seen before but not found in this sync will be set to zero inventory and sold out in Shopify.",
    accountIdFallbackNote: "If the eBay ID is not shown yet, reconnecting that account once should populate it.",
    enqueueSync: "Run Sync Now",
    retryLatest: "Retry Latest Run",
    sendTestAlert: "Send Test Alert",
    settings: "Settings",
    settingsDesc: "Save the automatic sync batch frequency and pricing options here. The saved result appears in 'Currently saved settings' below.",
    settingsOpsNote: "This app is designed for gradual batch-based syncs. For stable operation, we recommend keeping the total Shopify SKU count at 49,000 or below.",
    syncFrequency: "Automatic Sync Batch",
    nightlyBatch: "Once per day (night)",
    syncFields: "Sync Fields",
    syncFieldsHelp: "Check only the fields you want to sync.",
    weightSyncNote: "Weight Sync Note",
    weightSyncNoteDesc: "If you plan to use weight-based shipping, keep eBay weights as the actual packed shipping weight and set the Shopify default package weight to 0. That lets Shopify calculate shipping directly from the synced product weight.",
    fieldTitle: "Title",
    fieldDescription: "Description",
    fieldImages: "Images",
    fieldWeight: "Weight",
    fieldStock: "Stock",
    fixedFxRate: "Fixed FX Rate",
    fxRateMode: "FX Rate Mode",
    fxModeFixed: "Fixed Rate",
    fxModeAuto: "Auto Fetch (Frankfurter)",
    fxModeHelp: "Auto mode updates the rate from USD to the Shopify store currency during the automatic sync batch. The last fetched rate is reused until the next refresh.",
    fxModeCurrentPair: "Current auto pair",
    priceAdjustmentPercent: "Price Adjustment (%)",
    priceAdjustmentFixed: "Price Adjustment (Fixed Amount)",
    priceAdjustmentPercentHelp: "Adjust the Shopify store price relative to the eBay price. Use 10 for +10%, or -10 for a 10% discount.",
    priceAdjustmentFixedHelp: "Applied after currency conversion in the Shopify store currency. Use 300 for +300, or -300 for -300.",
    autoFxPair: "Currency Pair",
    autoFxLastRate: "Current applied rate",
    autoFxLastFetchedAt: "Last fetched at",
    roundRule: "Round Rule",
    roundNearest: "Nearest",
    roundUp: "Round Up",
    roundDown: "Round Down",
    slackNotifyWebhookUrl: "Slack Notify Webhook URL",
    slackNotifyWebhookUrlHelp: "Set a store-specific Slack Incoming Webhook URL to send sync issue alerts and test notifications to this store's Slack.",
    slackNotifyWebhookUrlHowTo: "You can get it by adding Incoming Webhooks in Slack.",
    slackNotifyWebhookUrlHelpLink: "Slack help",
    enablePriceSync: "Enable Price Sync",
    saveSettings: "Save Settings",
    resolveConflict: "Operator Only: Resolve Conflict",
    resolveConflictDesc: "Use this only when the same SKU exists in multiple eBay accounts. Normally you can leave this closed.",
    conflictId: "Conflict ID",
    note: "Note",
    resolve: "Resolve Conflict",
    syncErrors: "Sync Errors",
    syncErrorsDesc: "Use this only when a sync fails. You usually do not need it during normal use.",
    limit: "Limit",
    runIdOptional: "Run ID (optional)",
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
    itemDebug: "SKU Debug",
    itemDebugDesc: "Inspect the raw eBay response and weight fields for a specific eBay account ID and SKU.",
    itemDebugAccountId: "eBay Account ID",
    itemDebugSku: "SKU",
    itemDebugLoad: "Load SKU Debug",
    itemDebugJson: "SKU Debug JSON",
    noStatusLoaded: "No status loaded yet.",
    noEnqueueRequested: "No enqueue request sent yet.",
    noSettingsLoaded: "No settings loaded yet.",
    noConflictsLoaded: "No conflicts loaded yet.",
    noErrorsLoaded: "No sync errors loaded yet.",
    noResolveAction: "No conflict resolution action yet.",
    noRetryRequested: "No retry requested yet.",
    noNotifyRequested: "No notification test requested yet.",
    noItemDebugLoaded: "No SKU debug loaded yet.",
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
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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
    ebayUserId?: string | null;
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
    fxRateMode: string;
    fixedFxRate: number;
    priceAdjustmentPercent: number;
    priceAdjustmentFixed: number;
    autoFxLastRate?: number | null;
    autoFxLastFetchedAt?: string | null;
    autoFxLastTargetCurrency?: string | null;
    roundRule: string;
    slackNotifyWebhookUrl: string | null;
  };
};

type TestItemDraft = {
  sku: string;
  itemId: string;
  lastModified: string;
};

function createEmptyTestItem(): TestItemDraft {
  return { sku: "", itemId: "", lastModified: "" };
}

function serializeTestItems(items: TestItemDraft[]) {
  const normalized = items
    .map((item) => ({
      sku: item.sku.trim(),
      itemId: item.itemId.trim(),
      lastModified: item.lastModified.trim(),
    }))
    .filter((item) => item.sku || item.itemId || item.lastModified);

  return normalized.length > 0 ? JSON.stringify(normalized, null, 2) : "";
}

const syncFieldOptions = [
  { value: "title", labelKey: "fieldTitle" },
  { value: "description", labelKey: "fieldDescription" },
  { value: "images", labelKey: "fieldImages" },
  { value: "weight", labelKey: "fieldWeight" },
  { value: "stock", labelKey: "fieldStock" },
] as const;

export default function SyncConsolePage() {
  const { shop } = useLoaderData<typeof loader>();
  const [lang, setLang] = useState<Lang>("ja");
  const [clientReady, setClientReady] = useState(false);
  const [testItems, setTestItems] = useState<TestItemDraft[]>([createEmptyTestItem()]);
  const [advancedItemsJson, setAdvancedItemsJson] = useState("");
  const [selectedFxRateMode, setSelectedFxRateMode] = useState<"fixed" | "auto">("fixed");
  const [priceSyncEnabledDraft, setPriceSyncEnabledDraft] = useState(false);
  const [manualSyncAccountIds, setManualSyncAccountIds] = useState<string[]>([]);
  const [manualFullScanComplete, setManualFullScanComplete] = useState(false);
  const [manualSyncResult, setManualSyncResult] = useState<unknown>(null);
  const [manualSyncError, setManualSyncError] = useState<string | null>(null);
  const [manualSyncRunning, setManualSyncRunning] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

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
  const settingsSaveFetcher = useFetcher<SettingsResponsePayload>();
  const conflictsFetcher = useFetcher();
  const errorsFetcher = useFetcher();
  const resolveConflictFetcher = useFetcher();
  const retryFetcher = useFetcher();
  const notifyTestFetcher = useFetcher();
  const runsFetcher = useFetcher<SyncRunsPayload>();
  const disconnectFetcher = useFetcher();
  const itemDebugFetcher = useFetcher();

  useEffect(() => {
    if (!clientReady) return;
    statusFetcher.load("/api/sync/status");
    runsFetcher.load("/api/sync/runs?limit=20");
    settingsFetcher.load("/api/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientReady]);

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

  useEffect(() => {
    if (settingsSaveFetcher.data && settingsSaveFetcher.state === "idle") {
      settingsFetcher.load("/api/settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsSaveFetcher.data, settingsSaveFetcher.state]);

  const statusJson = useMemo(() => pretty(statusFetcher.data, t.noStatusLoaded), [statusFetcher.data, t.noStatusLoaded]);
  const settingsJson = useMemo(() => pretty(settingsFetcher.data, t.noSettingsLoaded), [settingsFetcher.data, t.noSettingsLoaded]);
  const conflictsJson = useMemo(() => pretty(conflictsFetcher.data, t.noConflictsLoaded), [conflictsFetcher.data, t.noConflictsLoaded]);
  const errorsJson = useMemo(() => pretty(errorsFetcher.data, t.noErrorsLoaded), [errorsFetcher.data, t.noErrorsLoaded]);
  const resolveJson = useMemo(() => pretty(resolveConflictFetcher.data, t.noResolveAction), [resolveConflictFetcher.data, t.noResolveAction]);
  const retryJson = useMemo(() => pretty(retryFetcher.data, t.noRetryRequested), [retryFetcher.data, t.noRetryRequested]);
  const notifyJson = useMemo(() => pretty(notifyTestFetcher.data, t.noNotifyRequested), [notifyTestFetcher.data, t.noNotifyRequested]);
  const itemDebugJson = useMemo(() => pretty(itemDebugFetcher.data, t.noItemDebugLoaded), [itemDebugFetcher.data, t.noItemDebugLoaded]);
  const runsJson = useMemo(() => pretty(runsFetcher.data, t.noRunHistoryLoaded), [runsFetcher.data, t.noRunHistoryLoaded]);

  const latestRun = statusFetcher.data?.latestRun || null;
  const runs = runsFetcher.data?.runs || [];
  const checkpoints = statusFetcher.data?.checkpoints || [];
  const connectedCheckpoints = checkpoints.filter((checkpoint) => checkpoint.status === "connected");
  const currentSettings = settingsFetcher.data?.settings || null;
  const accountSlots = ["primary", "account-2", "account-3", "account-4"];

  useEffect(() => {
    if (currentSettings?.fxRateMode === "auto" || currentSettings?.fxRateMode === "fixed") {
      setSelectedFxRateMode(currentSettings.fxRateMode);
    }
  }, [currentSettings?.fxRateMode]);

  useEffect(() => {
    setPriceSyncEnabledDraft(currentSettings?.priceSyncEnabled ?? false);
  }, [currentSettings?.priceSyncEnabled]);

  useEffect(() => {
    const connectedIds = connectedCheckpoints.map((checkpoint) => String(checkpoint.ebayAccountId));
    setManualSyncAccountIds((current) => {
      const filtered = current.filter((id) => connectedIds.includes(id));
      if (filtered.length > 0) return filtered;
      if (latestRun?.ebayAccountId && connectedIds.includes(String(latestRun.ebayAccountId))) {
        return [String(latestRun.ebayAccountId)];
      }
      if (connectedIds.length === 1) return [connectedIds[0]];
      return [];
    });
  }, [connectedCheckpoints, latestRun?.ebayAccountId]);

  const checkpointByLabel = new Map(checkpoints.map((c) => [c.label, c]));
  const refreshAll = () => {
    statusFetcher.load("/api/sync/status");
    runsFetcher.load("/api/sync/runs?limit=20");
    settingsFetcher.load("/api/settings");
    conflictsFetcher.load("/api/conflicts");
  };
  const activeConnectedCount = connectedCheckpoints.length;
  const serializedTestItems = useMemo(() => {
    const advanced = advancedItemsJson.trim();
    return advanced || serializeTestItems(testItems);
  }, [advancedItemsJson, testItems]);
  const autoFxTargetCurrency = currentSettings?.autoFxLastTargetCurrency || null;
  const autoFxPairLabel = autoFxTargetCurrency ? `USD -> ${autoFxTargetCurrency}` : "-";
  const autoFxRateLabel =
    currentSettings?.autoFxLastRate != null && autoFxTargetCurrency
      ? `1 USD = ${currentSettings.autoFxLastRate} ${autoFxTargetCurrency}`
      : "-";
  const enqueueJson = useMemo(
    () => pretty(manualSyncResult ?? enqueueFetcher.data, t.noEnqueueRequested),
    [manualSyncResult, enqueueFetcher.data, t.noEnqueueRequested],
  );

  if (!clientReady) {
    return (
      <div suppressHydrationWarning style={{ padding: 16 }}>
        {lang === "ja" ? "読み込み中..." : "Loading..."}
      </div>
    );
  }

  const runManualSync = async () => {
    if (manualSyncAccountIds.length === 0) {
      setManualSyncError(t.manualSyncNoSelection);
      return;
    }

    setManualSyncError(null);
    setManualSyncRunning(true);

    try {
      const results: Array<Record<string, unknown>> = [];
      for (const accountId of manualSyncAccountIds) {
        const form = new FormData();
        form.set("shop", shop);
        form.set("mode", "rolling");
        form.set("ebayAccountId", accountId);
        form.set("itemsJson", "");
        if (manualFullScanComplete) {
          form.append("fullScanComplete", "true");
        }

        const response = await fetch("/jobs/enqueue-sync", {
          method: "POST",
          body: form,
        });
        const json = (await response.json().catch(() => null)) as unknown;
        results.push({
          accountId: Number(accountId),
          status: response.status,
          ok: response.ok,
          result: json,
        });
      }

      setManualSyncResult({
        mode: "manual_multi_account",
        fullScanComplete: manualFullScanComplete,
        results,
      });
      statusFetcher.load("/api/sync/status");
      runsFetcher.load("/api/sync/runs?limit=20");
    } catch (error) {
      setManualSyncError(error instanceof Error ? error.message : t.unknown);
    } finally {
      setManualSyncRunning(false);
    }
  };

  return (
    <s-page heading={t.pageHeading}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <s-button variant={lang === "ja" ? "primary" : "secondary"} onClick={() => switchLang("ja")}>{t.japanese}</s-button>
        <s-button variant={lang === "en" ? "primary" : "secondary"} onClick={() => switchLang("en")}>{t.english}</s-button>
      </div>

      <s-section heading={t.step1}>
        <s-paragraph>{t.accountConnectionsDesc}</s-paragraph>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.syncDirectionTitle}</strong>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.syncDirectionLead}</div>
              <s-paragraph>{t.syncDirectionDesc}</s-paragraph>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.skuSyncRuleTitle}</strong>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.skuSyncRuleLead}</div>
              <s-paragraph>{t.skuSyncRuleDesc}</s-paragraph>
            </s-stack>
          </s-box>
        </div>
        <div style={{ marginBottom: 12, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
          {lang === "ja" ? "現在の接続数:" : "Connected now:"}{" "}
          <span style={{ color: "#0f172a", fontWeight: 700 }}>{activeConnectedCount} / 4</span>
        </div>
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <s-button onClick={refreshAll}>{t.refreshStatus}</s-button>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {accountSlots.map((slotLabel, index) => {
            const checkpoint = checkpointByLabel.get(slotLabel);
            const isConnected = checkpoint?.status === "connected";
            const accountDisplayName = checkpoint?.ebayUserId?.trim() || slotLabel;
            return (
              <s-box
                key={slotLabel}
                borderWidth="base"
                borderRadius="base"
                padding="base"
                style={{ minWidth: 0, height: "100%" }}
              >
                <s-stack direction="block" gap="base" style={{ height: "100%", justifyContent: "space-between" }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{t.slot} {index + 1}: {accountDisplayName}</strong>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#f1f5f9",
                            color: "#334155",
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          {slotLabel}
                        </span>
                      </div>
                    </div>
                  {checkpoint?.ebayUserId ? (
                    <small style={{ color: "#666" }}>{checkpoint.ebayUserId}</small>
                  ) : null}
                  {isConnected && !checkpoint?.ebayUserId ? (
                    <small style={{ color: "#666", lineHeight: 1.5 }}>{t.accountIdFallbackNote}</small>
                  ) : null}
                  <s-badge tone={isConnected ? "success" : "neutral"}>
                    {isConnected
                      ? `${t.connected} (#${checkpoint?.ebayAccountId})`
                      : t.notConnected}
                  </s-badge>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
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
                  </div>
                </s-stack>
              </s-box>
            );
          })}
        </div>
      </s-section>

      <s-section heading={t.step2}>
        <s-paragraph>{t.settingsDesc}</s-paragraph>
        <s-paragraph>{t.settingsOpsNote}</s-paragraph>
        {currentSettings ? (
          <>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <strong>{lang === "ja" ? "現在の保存設定" : "Currently saved settings"}</strong>
              <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                <div>{t.syncFrequency}: {t.nightlyBatch}</div>
                <div>{t.syncFields}: {currentSettings.syncFields.join(", ")}</div>
                <div>{t.fxRateMode}: {currentSettings.fxRateMode === "auto" ? t.fxModeAuto : t.fxModeFixed}</div>
                <div>{t.fixedFxRate}: {currentSettings.fixedFxRate}</div>
                <div>{t.priceAdjustmentPercent}: {currentSettings.priceAdjustmentPercent}%</div>
                <div>{t.priceAdjustmentFixed}: {currentSettings.priceAdjustmentFixed}</div>
                <div>{t.autoFxPair}: {autoFxPairLabel}</div>
                <div>{t.autoFxLastRate}: {autoFxRateLabel}</div>
                <div>{t.autoFxLastFetchedAt}: {formatDate(currentSettings.autoFxLastFetchedAt)}</div>
                <div>{t.roundRule}: {currentSettings.roundRule}</div>
                <div>{t.enablePriceSync}: {currentSettings.priceSyncEnabled ? "ON" : "OFF"}</div>
                <div>{t.slackNotifyWebhookUrl}: {currentSettings.slackNotifyWebhookUrl ? "Configured" : "-"}</div>
              </div>
            </s-box>
            <div style={{ height: 24 }} />
          </>
        ) : null}
        <settingsSaveFetcher.Form method="post" action="/api/settings">
          <s-stack direction="block" gap="base" style={{ marginTop: 0 }}>
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", alignItems: "start" }}>
              <div style={{ display: "grid", gap: 16 }}>
                <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                  <span>{t.syncFrequency}</span>
                  <input type="hidden" name="syncFrequencyMinutes" value="1440" />
                  <input type="text" value={t.nightlyBatch} disabled />
                </label>
                <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                  <span>{t.syncFields}</span>
                  <div style={{ display: "grid", gap: 6 }}>
                    {syncFieldOptions.map((option) => (
                      <label key={option.value} style={{ display: "inline-flex", gap: 8 }}>
                        <input
                          type="checkbox"
                          name="syncFields"
                          value={option.value}
                          defaultChecked={
                            currentSettings?.syncFields?.includes(option.value) ??
                            true
                          }
                        />
                        <span>{t[option.labelKey]}</span>
                      </label>
                    ))}
                  </div>
                  <small>{t.syncFieldsHelp}</small>
                  <small style={{ lineHeight: 1.6 }}>{t.weightSyncNote}: {t.weightSyncNoteDesc}</small>
                </label>
                <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                  <span>{t.slackNotifyWebhookUrl}</span>
                  <input
                    type="url"
                    name="slackNotifyWebhookUrl"
                    placeholder="https://hooks.slack.com/services/..."
                    defaultValue={currentSettings?.slackNotifyWebhookUrl ?? ""}
                  />
                  <small>{t.slackNotifyWebhookUrlHelp}</small>
                  <small>
                    {t.slackNotifyWebhookUrlHowTo}{" "}
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.slackNotifyWebhookUrlHelpLink}
                    </a>
                  </small>
                </label>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="priceSyncEnabled" value="false" />
                  <input
                    type="checkbox"
                    name="priceSyncEnabled"
                    value="true"
                    checked={priceSyncEnabledDraft}
                    onChange={(event) => setPriceSyncEnabledDraft(event.currentTarget.checked)}
                  />
                  <span>{t.enablePriceSync}</span>
                </label>
                <div style={{ display: priceSyncEnabledDraft ? "grid" : "none", gap: 16 }}>
                  <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                      <span>{t.fxRateMode}</span>
                      <select
                        name="fxRateMode"
                        value={selectedFxRateMode}
                        onChange={(event) =>
                          setSelectedFxRateMode(event.currentTarget.value === "auto" ? "auto" : "fixed")
                        }
                      >
                        <option value="fixed">{t.fxModeFixed}</option>
                        <option value="auto">{t.fxModeAuto}</option>
                      </select>
                      <small>{t.fxModeHelp}</small>
                      {selectedFxRateMode === "auto" ? (
                        <small>{t.fxModeCurrentPair}: {autoFxPairLabel}</small>
                      ) : null}
                  </label>
                  <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                      <span>{t.fixedFxRate}</span>
                      {selectedFxRateMode === "auto" ? (
                        <input
                          type="hidden"
                          name="fixedFxRate"
                          value={currentSettings?.fixedFxRate ?? 150}
                        />
                      ) : null}
                      <input
                        type="number"
                        name="fixedFxRate"
                        step="0.01"
                        defaultValue={currentSettings?.fixedFxRate ?? 150}
                        disabled={selectedFxRateMode === "auto"}
                      />
                  </label>
                  <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                      <span>{t.priceAdjustmentPercent}</span>
                      <input
                        type="number"
                        name="priceAdjustmentPercent"
                        step="0.01"
                        defaultValue={currentSettings?.priceAdjustmentPercent ?? 0}
                      />
                      <small>{t.priceAdjustmentPercentHelp}</small>
                  </label>
                  <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                      <span>{t.priceAdjustmentFixed}</span>
                      <input
                        type="number"
                        name="priceAdjustmentFixed"
                        step="0.01"
                        defaultValue={currentSettings?.priceAdjustmentFixed ?? 0}
                      />
                      <small>{t.priceAdjustmentFixedHelp}</small>
                  </label>
                  <label style={{ display: "grid", gap: 4, maxWidth: 420 }}>
                      <span>{t.roundRule}</span>
                      <select name="roundRule" defaultValue={currentSettings?.roundRule ?? "nearest"}>
                        <option value="nearest">{t.roundNearest}</option>
                        <option value="up">{t.roundUp}</option>
                        <option value="down">{t.roundDown}</option>
                      </select>
                  </label>
                </div>
                {!priceSyncEnabledDraft ? (
                  <s-paragraph style={{ margin: 0 }}>
                    {lang === "ja"
                      ? "有効にすると、為替レート方式や価格調整などの価格設定が表示されます。"
                      : "Turn this on to show FX rate, price adjustment, and rounding settings."}
                  </s-paragraph>
                ) : null}
              </div>
            </div>
            <s-button type="submit" {...(settingsSaveFetcher.state !== "idle" ? { loading: true } : {})}>{t.saveSettings}</s-button>
          </s-stack>
        </settingsSaveFetcher.Form>
      </s-section>

      <s-section heading={t.step3}>
        <s-paragraph>{t.runSyncDesc}</s-paragraph>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <strong>{t.runSync}</strong>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <span>{t.selectManualAccounts}</span>
                <small style={{ color: "#666", lineHeight: 1.5 }}>{t.manualSyncTargetsHelp}</small>
                <div style={{ display: "grid", gap: 6 }}>
                  {connectedCheckpoints.map((checkpoint) => {
                    const accountId = String(checkpoint.ebayAccountId);
                    const checked = manualSyncAccountIds.includes(accountId);
                    return (
                      <label key={checkpoint.ebayAccountId} style={{ display: "inline-flex", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setManualSyncAccountIds((current) =>
                              event.currentTarget.checked
                                ? [...current, accountId]
                                : current.filter((value) => value !== accountId),
                            );
                          }}
                        />
                        <span>
                          #{checkpoint.ebayAccountId} ({checkpoint.ebayUserId?.trim() || checkpoint.label})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label style={{ display: "inline-flex", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={manualFullScanComplete}
                  onChange={(event) => setManualFullScanComplete(event.currentTarget.checked)}
                />
                <span>{t.forceFullScan}</span>
              </label>
              <small style={{ lineHeight: 1.5, color: "#666" }}>{t.forceFullScanHelp}</small>
              {manualSyncError ? (
                <small style={{ color: "#b42318", lineHeight: 1.5 }}>{manualSyncError}</small>
              ) : null}
              <s-button onClick={runManualSync} {...(manualSyncRunning ? { loading: true } : {})}>
                {manualSyncRunning ? t.manualSyncRunning : t.manualSyncButton}
              </s-button>
            </div>
            <retryFetcher.Form method="post" action="/api/sync/retry">
              <s-button type="submit" {...(retryFetcher.state !== "idle" ? { loading: true } : {})}>{t.retryLatest}</s-button>
            </retryFetcher.Form>
            <notifyTestFetcher.Form method="post" action="/api/sync/notify-test">
              <s-button type="submit" {...(notifyTestFetcher.state !== "idle" ? { loading: true } : {})}>{t.sendTestAlert}</s-button>
            </notifyTestFetcher.Form>
          </s-stack>
        </s-box>

        <div style={{ marginTop: 16 }}>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <strong>{t.reflectTest}</strong>
              <s-paragraph>{t.reflectTestDesc}</s-paragraph>
              <small>{t.reflectTestEmpty}</small>
              <enqueueFetcher.Form method="post" action="/jobs/enqueue-sync">
                <input type="hidden" name="shop" value={shop} />
                <input type="hidden" name="mode" value="rolling" />
                <input type="hidden" name="fullScanComplete" value="false" />
                <input type="hidden" name="itemsJson" value={serializedTestItems} />
                <label style={{ display: "grid", gap: 4, maxWidth: 360, marginTop: 12 }}>
                  <span>{t.reflectTestAccount}</span>
                  <select name="ebayAccountId" defaultValue="">
                    <option value="">{t.selectAccountPlaceholder}</option>
                    {connectedCheckpoints.map((checkpoint) => (
                      <option key={checkpoint.ebayAccountId} value={checkpoint.ebayAccountId}>
                        #{checkpoint.ebayAccountId} ({checkpoint.ebayUserId?.trim() || checkpoint.label}) - {checkpoint.status}
                      </option>
                    ))}
                  </select>
                </label>
                {testItems.map((item, index) => (
                  <div
                    key={`test-item-${index}`}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 12,
                      border: "1px solid var(--s-color-border-default)",
                      borderRadius: 8,
                      maxWidth: 520,
                      marginTop: 12,
                    }}
                  >
                    <strong>{t.testItem} {index + 1}</strong>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>{t.sku}</span>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(event) => {
                          const next = [...testItems];
                          next[index] = { ...next[index], sku: event.target.value };
                          setTestItems(next);
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>{t.itemId}</span>
                      <input
                        type="text"
                        value={item.itemId}
                        onChange={(event) => {
                          const next = [...testItems];
                          next[index] = { ...next[index], itemId: event.target.value };
                          setTestItems(next);
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>{t.lastModified}</span>
                      <input
                        type="text"
                        placeholder="2026-03-05T00:00:00Z"
                        value={item.lastModified}
                        onChange={(event) => {
                          const next = [...testItems];
                          next[index] = { ...next[index], lastModified: event.target.value };
                          setTestItems(next);
                        }}
                      />
                    </label>
                    {testItems.length > 1 ? (
                      <s-button
                        variant="secondary"
                        onClick={() => setTestItems(testItems.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        {t.removeTestItem}
                      </s-button>
                    ) : null}
                  </div>
                ))}
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <s-button variant="secondary" onClick={() => setTestItems([...testItems, createEmptyTestItem()])}>
                    {t.addTestItem}
                  </s-button>
                  <details>
                    <summary>{t.advancedJson}</summary>
                    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                      <small>{t.advancedJsonDesc}</small>
                      <textarea
                        rows={8}
                        value={advancedItemsJson}
                        onChange={(event) => setAdvancedItemsJson(event.target.value)}
                        style={{ minWidth: 420 }}
                        placeholder={`[\n  {"sku":"SKU-001","itemId":"ITEM-001","lastModified":"2026-03-05T00:00:00Z"}\n]`}
                      />
                    </div>
                  </details>
                  <s-button type="submit" {...(enqueueFetcher.state !== "idle" ? { loading: true } : {})}>{t.reflectTestRun}</s-button>
                </div>
              </enqueueFetcher.Form>
            </s-stack>
          </s-box>
        </div>
      </s-section>

      <s-section heading={t.step4}>
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
        <div style={{ marginTop: 16 }}>
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
        </div>
      </s-section>

      <s-section heading={t.debugData}>
        <s-paragraph>{t.debugDataDesc}</s-paragraph>
        <details>
          <summary>{t.resolveConflict}</summary>
          <div style={{ marginTop: 12 }}>
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
          </div>
        </details>
        <details>
          <summary>{t.syncErrors}</summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
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
                <div style={{ alignSelf: "end" }}>
                  <s-button type="submit" {...(errorsFetcher.state !== "idle" ? { loading: true } : {})}>
                    {t.loadErrors}
                  </s-button>
                </div>
              </s-stack>
            </errorsFetcher.Form>
          </div>
        </details>
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
        <details>
          <summary>{t.itemDebug}</summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <s-paragraph>{t.itemDebugDesc}</s-paragraph>
            <itemDebugFetcher.Form method="get" action="/api/debug/ebay-item">
              <s-stack direction="inline" gap="base">
                <label style={{ display: "grid", gap: 4, maxWidth: 220 }}>
                  <span>{t.itemDebugAccountId}</span>
                  <input type="number" name="accountId" min={1} placeholder="1" />
                </label>
                <label style={{ display: "grid", gap: 4, maxWidth: 320 }}>
                  <span>{t.itemDebugSku}</span>
                  <input type="text" name="sku" placeholder="A111" />
                </label>
                <div style={{ alignSelf: "end" }}>
                  <s-button type="submit" {...(itemDebugFetcher.state !== "idle" ? { loading: true } : {})}>
                    {t.itemDebugLoad}
                  </s-button>
                </div>
              </s-stack>
            </itemDebugFetcher.Form>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <strong>{t.itemDebugJson}</strong>
              <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{itemDebugJson}</pre>
            </s-box>
          </div>
        </details>
      </s-section>
    </s-page>
  );
}
