import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

type Lang = "ja" | "en";

const textMap = {
  ja: {
    pageHeading: "Settings",
    loading: "読み込み中...",
    japanese: "日本語",
    english: "English",
    introTitle: "このページについて",
    introBody: "Sync Console は日々の同期運用に使います。Settings は、このアプリの前提ルールや問い合わせ先を確認するためのページです。",
    syncConsoleLinkText: "Sync Console を開く",
    rulesHeading: "運用ルール",
    syncDirectionTitle: "同期方向",
    syncDirectionBody: "このアプリは eBay から Shopify への一方向同期です。Shopifyで売れても、eBayの在庫数は自動では変わりません。Shopifyで編集した内容も、eBayには反映されません。",
    syncKeyTitle: "同期の基準",
    syncKeyBody: "商品は SKU を基準に作成・更新します。同じSKUが別のeBayアカウントにある場合、自動で重複作成せず、競合として止めます。",
    weightTitle: "重量同期",
    weightBody: "Shopify の重量別送料を使う場合は、eBay 側の重量を梱包込みの発送重量でそろえ、Shopify のデフォルトパッケージ重量は 0 にしてください。",
    notificationsTitle: "通知",
    notificationsBody: "Slack 通知は任意です。ストア専用の Slack Incoming Webhook URL を設定すると、同期エラー通知とテスト通知をそのストアの Slack に送れます。",
    contactHeading: "問い合わせ先",
    contactBody: "サポート先や運用メモをここに追加していく想定です。",
  },
  en: {
    pageHeading: "Settings",
    loading: "Loading...",
    japanese: "日本語",
    english: "English",
    introTitle: "About this page",
    introBody: "Use Sync Console for daily sync operations. Settings is a simple reference page for this app's operating rules and support information.",
    syncConsoleLinkText: "Open Sync Console",
    rulesHeading: "Operating rules",
    syncDirectionTitle: "Sync direction",
    syncDirectionBody: "This app is one-way only: eBay to Shopify. If a product sells on Shopify, eBay inventory is not changed automatically. Edits made in Shopify are not pushed back to eBay.",
    syncKeyTitle: "Sync key",
    syncKeyBody: "Products are created and updated by SKU. If the same SKU appears in another eBay account, the app does not create a duplicate automatically and stops it as a conflict.",
    weightTitle: "Weight sync",
    weightBody: "If you plan to use Shopify weight-based shipping, keep eBay weights as packed shipping weights and keep the Shopify default package weight at 0.",
    notificationsTitle: "Notifications",
    notificationsBody: "Slack notifications are optional. If a store-specific Slack Incoming Webhook URL is set, sync issue alerts and test alerts can be sent to that store's Slack.",
    contactHeading: "Support",
    contactBody: "This area can be used later for support details and operating notes.",
  },
} as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function SettingsPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("syncConsoleLang") : null;
    if (saved === "ja" || saved === "en") {
      setLang(saved);
    }
  }, []);

  const switchLang = (next: Lang) => {
    setLang(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("syncConsoleLang", next);
    }
  };

  const t = textMap[lang];

  if (!clientReady) {
    return (
      <div suppressHydrationWarning style={{ padding: 16 }}>
        {t.loading}
      </div>
    );
  }

  return (
    <s-page heading={t.pageHeading}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <s-button variant={lang === "ja" ? "primary" : "secondary"} onClick={() => switchLang("ja")}>{t.japanese}</s-button>
        <s-button variant={lang === "en" ? "primary" : "secondary"} onClick={() => switchLang("en")}>{t.english}</s-button>
      </div>

      <s-box borderWidth="base" borderRadius="base" padding="base">
        <s-stack direction="block" gap="tight">
          <strong>{t.introTitle}</strong>
          <s-paragraph>{t.introBody}</s-paragraph>
          <div>
            <s-link href="/app/sync">{t.syncConsoleLinkText}</s-link>
          </div>
        </s-stack>
      </s-box>

      <s-section heading={t.rulesHeading}>
        <s-stack direction="block" gap="base">
          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.syncDirectionTitle}</strong>
              <s-paragraph>{t.syncDirectionBody}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.syncKeyTitle}</strong>
              <s-paragraph>{t.syncKeyBody}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.weightTitle}</strong>
              <s-paragraph>{t.weightBody}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.notificationsTitle}</strong>
              <s-paragraph>{t.notificationsBody}</s-paragraph>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading={t.contactHeading}>
        <s-box borderWidth="base" borderRadius="base" padding="base">
          <s-paragraph>{t.contactBody}</s-paragraph>
        </s-box>
      </s-section>
    </s-page>
  );
}
