import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { SettingsDebugSection } from "./SettingsDebugSection";

type Lang = "ja" | "en";
type Variant = "home" | "settings";

const textMap = {
  ja: {
    pageHeadingHome: "Top",
    pageHeadingSettings: "Settings",
    loading: "読み込み中...",
    japanese: "日本語",
    english: "English",
    introTitleHome: "このページについて",
    introTitleSettings: "このページについて",
    introBodyHome: "Sync Console は日々の同期運用に使います。このページは、このアプリの前提ルールや問い合わせ先を確認するためのトップページです。",
    introBodySettings: "このページでは、同期ルールの確認とお問い合わせができます。",
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
    contactIntro: "ご不明点はこちらへお問い合わせください。",
    contactName: "お名前",
    contactEmail: "メールアドレス",
    contactMessage: "お問い合わせ内容",
    contactUpload: "ファイル添付",
    contactSubmit: "送信",
  },
  en: {
    pageHeadingHome: "Top",
    pageHeadingSettings: "Settings",
    loading: "Loading...",
    japanese: "日本語",
    english: "English",
    introTitleHome: "About this page",
    introTitleSettings: "About Settings",
    introBodyHome: "Use Sync Console for daily sync operations. This page is the top page for this app's operating rules and support information.",
    introBodySettings: "Use Sync Console for daily sync operations. This page is for the operating rules and support information of this app.",
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
    contactIntro: "If you have any questions, please contact us here.",
    contactName: "Name",
    contactEmail: "Email address",
    contactMessage: "Message",
    contactUpload: "Upload file",
    contactSubmit: "Send",
  },
} as const;

export function AppHomeContent({ variant = "home" }: { variant?: Variant }) {
  const [lang, setLang] = useState<Lang>("ja");
  const [clientReady, setClientReady] = useState(false);
  const contactFetcher = useFetcher<{ ok?: boolean; error?: string; message?: string }>();

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
  const pageHeading = variant === "home" ? t.pageHeadingHome : t.pageHeadingSettings;
  const introTitle = variant === "home" ? t.introTitleHome : t.introTitleSettings;
  const introBody = variant === "home" ? t.introBodyHome : t.introBodySettings;
  const contactState = contactFetcher.state;
  const contactResult = contactFetcher.data;

  if (!clientReady) {
    return (
      <div suppressHydrationWarning style={{ padding: 16 }}>
        {t.loading}
      </div>
    );
  }

  return (
    <s-page heading={pageHeading}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <s-button variant={lang === "ja" ? "primary" : "secondary"} onClick={() => switchLang("ja")}>{t.japanese}</s-button>
        <s-button variant={lang === "en" ? "primary" : "secondary"} onClick={() => switchLang("en")}>{t.english}</s-button>
      </div>

      <s-stack direction="block" gap="tight" style={{ marginBottom: 20 }}>
        <strong>{introTitle}</strong>
        <s-paragraph>{introBody}</s-paragraph>
        <div>
          <s-link href="/app/sync">{t.syncConsoleLinkText}</s-link>
        </div>
      </s-stack>

      <s-section heading={t.rulesHeading}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
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
        </div>
      </s-section>

      <s-section heading={t.contactHeading}>
        <contactFetcher.Form method="post" action="/api/contact" encType="multipart/form-data">
          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="base">
            <s-paragraph>{t.contactIntro}</s-paragraph>

            <s-text-field
              label={t.contactName}
              name="name"
              required
              style={{ width: "100%" }}
            />

            <s-email-field
              label={t.contactEmail}
              name="email"
              required
              style={{ width: "100%" }}
            />

            <s-text-area
              label={t.contactMessage}
              name="message"
              required
              style={{ width: "100%" }}
            />

            <s-drop-zone
              label={t.contactUpload}
              accessibilityLabel={t.contactUpload}
              name="attachment"
              style={{ width: "100%" }}
            />

            {contactResult?.message ? (
              <div style={{ color: "#166534", lineHeight: 1.6 }}>{contactResult.message}</div>
            ) : null}
            {contactResult?.error ? (
              <div style={{ color: "#b91c1c", lineHeight: 1.6 }}>{contactResult.error}</div>
            ) : null}

            <div>
              <s-button type="submit" {...(contactState !== "idle" ? { loading: true } : {})}>
                {t.contactSubmit}
              </s-button>
            </div>
            </s-stack>
          </s-box>
        </contactFetcher.Form>
      </s-section>

      {variant === "settings" ? <SettingsDebugSection lang={lang} /> : null}
    </s-page>
  );
}
