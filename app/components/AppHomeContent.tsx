import { useEffect, useState } from "react";

type Lang = "ja" | "en";

const textMap = {
  ja: {
    pageHeading: "Top",
    loading: "読み込み中...",
    japanese: "日本語",
    english: "English",
    introTitle: "このページについて",
    introBody: "Sync Console は日々の同期運用に使います。このページは、このアプリの前提ルールや問い合わせ先を確認するためのトップページです。",
    syncConsoleLinkText: "Sync Console を開く",
    rulesHeading: "運用ルール",
    syncDirectionTitle: "同期方向",
    syncDirectionLead: "eBay → Shopify",
    syncDirectionBody: "Shopify → eBay はしません",
    syncKeyTitle: "同期の基準",
    syncKeyLead: "SKU で同期",
    syncKeyBody: "同じSKUが別アカウントにある場合は競合で停止します",
    weightTitle: "重量同期",
    weightLead: "eBay の重量を Shopify へ同期",
    weightBody: "重量別送料を使う場合は、梱包込み重量を推奨します",
    notificationsTitle: "通知",
    notificationsLead: "Slack 通知は任意",
    notificationsBody: "Webhook を設定したストアだけ通知します",
    contactHeading: "問い合わせ先",
    contactFormHeading: "お問い合わせフォーム",
    contactName: "お名前",
    contactEmail: "メールアドレス",
    contactMessage: "お問い合わせ内容",
    contactUpload: "ファイル添付",
    contactSubmit: "送信",
  },
  en: {
    pageHeading: "Top",
    loading: "Loading...",
    japanese: "日本語",
    english: "English",
    introTitle: "About this page",
    introBody: "Use Sync Console for daily sync operations. This page is the top page for this app's operating rules and support information.",
    syncConsoleLinkText: "Open Sync Console",
    rulesHeading: "Operating rules",
    syncDirectionTitle: "Sync direction",
    syncDirectionLead: "eBay → Shopify",
    syncDirectionBody: "Shopify → eBay is not supported",
    syncKeyTitle: "Sync key",
    syncKeyLead: "Sync by SKU",
    syncKeyBody: "If the same SKU appears in another account, it stops as a conflict",
    weightTitle: "Weight sync",
    weightLead: "Sync eBay weight to Shopify",
    weightBody: "Packed shipping weight is recommended for weight-based shipping",
    notificationsTitle: "Notifications",
    notificationsLead: "Slack is optional",
    notificationsBody: "Only stores with a webhook set receive notifications",
    contactHeading: "Support",
    contactFormHeading: "Contact form",
    contactName: "Name",
    contactEmail: "Email address",
    contactMessage: "Message",
    contactUpload: "Upload file",
    contactSubmit: "Send",
  },
} as const;

export function AppHomeContent() {
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
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.syncDirectionLead}</div>
              <s-paragraph>{t.syncDirectionBody}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.syncKeyTitle}</strong>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.syncKeyLead}</div>
              <s-paragraph>{t.syncKeyBody}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.weightTitle}</strong>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.weightLead}</div>
              <s-paragraph>{t.weightBody}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>{t.notificationsTitle}</strong>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.notificationsLead}</div>
              <s-paragraph>{t.notificationsBody}</s-paragraph>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading={t.contactHeading}>
        <s-box borderWidth="base" borderRadius="base" padding="base">
          <s-stack direction="block" gap="base">
            <strong>{t.contactFormHeading}</strong>

            <label style={{ display: "grid", gap: 4, maxWidth: 520 }}>
              <span>{t.contactName}</span>
              <input type="text" />
            </label>

            <label style={{ display: "grid", gap: 4, maxWidth: 520 }}>
              <span>{t.contactEmail}</span>
              <input type="email" />
            </label>

            <label style={{ display: "grid", gap: 4, maxWidth: 720 }}>
              <span>{t.contactMessage}</span>
              <textarea rows={8} />
            </label>

            <label style={{ display: "grid", gap: 4, maxWidth: 520 }}>
              <span>{t.contactUpload}</span>
              <input type="file" />
            </label>

            <div>
              <s-button>{t.contactSubmit}</s-button>
            </div>
          </s-stack>
        </s-box>
      </s-section>
    </s-page>
  );
}
