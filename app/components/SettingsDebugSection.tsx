import { useEffect, useMemo } from "react";
import { useFetcher } from "react-router";

type Lang = "ja" | "en";

const textMap = {
  ja: {
    debugData: "デバッグ情報",
    debugDataDesc: "開発・調査用の生データです。普段は開かなくて大丈夫です。",
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
    syncStatusJson: "同期ステータスJSON",
    settingsJson: "設定JSON",
    conflictsJson: "競合JSON",
    syncErrorsJson: "同期エラーJSON",
    itemDebug: "SKUデバッグ",
    itemDebugDesc: "指定したeBayアカウントIDとSKUについて、eBayの生レスポンスと重量情報を確認します。",
    itemDebugAccountId: "eBayアカウントID",
    itemDebugSku: "SKU",
    itemDebugLoad: "SKUデバッグを読み込む",
    itemDebugJson: "SKUデバッグJSON",
    noStatusLoaded: "ステータス未読み込み",
    noSettingsLoaded: "設定未読み込み",
    noConflictsLoaded: "競合未読み込み",
    noErrorsLoaded: "エラー未読み込み",
    noResolveAction: "競合解消未実行",
    noItemDebugLoaded: "SKUデバッグ未読み込み",
  },
  en: {
    debugData: "Debug Data",
    debugDataDesc: "Raw developer-facing data. You usually do not need to open this.",
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
    syncStatusJson: "Sync Status JSON",
    settingsJson: "Settings JSON",
    conflictsJson: "Conflicts JSON",
    syncErrorsJson: "Sync Errors JSON",
    itemDebug: "SKU Debug",
    itemDebugDesc: "Inspect the raw eBay response and weight fields for a specific eBay account ID and SKU.",
    itemDebugAccountId: "eBay Account ID",
    itemDebugSku: "SKU",
    itemDebugLoad: "Load SKU Debug",
    itemDebugJson: "SKU Debug JSON",
    noStatusLoaded: "No status loaded yet.",
    noSettingsLoaded: "No settings loaded yet.",
    noConflictsLoaded: "No conflicts loaded yet.",
    noErrorsLoaded: "No sync errors loaded yet.",
    noResolveAction: "No conflict resolution action yet.",
    noItemDebugLoaded: "No SKU debug loaded yet.",
  },
} as const;

function pretty(data: unknown, empty = "No data yet.") {
  if (!data) return empty;
  return JSON.stringify(data, null, 2);
}

export function SettingsDebugSection({ lang }: { lang: Lang }) {
  const t = textMap[lang];
  const statusFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const conflictsFetcher = useFetcher();
  const errorsFetcher = useFetcher();
  const resolveConflictFetcher = useFetcher();
  const itemDebugFetcher = useFetcher();

  useEffect(() => {
    statusFetcher.load("/api/sync/status");
    settingsFetcher.load("/api/settings");
    conflictsFetcher.load("/api/conflicts");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resolveConflictFetcher.data && resolveConflictFetcher.state === "idle") {
      conflictsFetcher.load("/api/conflicts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveConflictFetcher.data, resolveConflictFetcher.state]);

  const statusJson = useMemo(() => pretty(statusFetcher.data, t.noStatusLoaded), [statusFetcher.data, t.noStatusLoaded]);
  const settingsJson = useMemo(() => pretty(settingsFetcher.data, t.noSettingsLoaded), [settingsFetcher.data, t.noSettingsLoaded]);
  const conflictsJson = useMemo(() => pretty(conflictsFetcher.data, t.noConflictsLoaded), [conflictsFetcher.data, t.noConflictsLoaded]);
  const errorsJson = useMemo(() => pretty(errorsFetcher.data, t.noErrorsLoaded), [errorsFetcher.data, t.noErrorsLoaded]);
  const resolveJson = useMemo(() => pretty(resolveConflictFetcher.data, t.noResolveAction), [resolveConflictFetcher.data, t.noResolveAction]);
  const itemDebugJson = useMemo(() => pretty(itemDebugFetcher.data, t.noItemDebugLoaded), [itemDebugFetcher.data, t.noItemDebugLoaded]);

  return (
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
        <s-box padding="base" borderWidth="base" borderRadius="base" style={{ marginTop: 12 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{resolveJson}</pre>
        </s-box>
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
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{errorsJson}</pre>
          </s-box>
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
  );
}
