export default function SettingsPage() {
  return (
    <s-page heading="Settings">
      <s-section heading="How to use this app">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Use <strong>Sync Console</strong> for the actual eBay to Shopify sync work.
            This page is a simple reference for the operating rules of the app.
          </s-paragraph>
          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>Sync key</strong>
              <s-paragraph>
                Products are created and updated by SKU. If the same SKU appears in
                another eBay account, the app does not create a duplicate automatically
                and stops it as a conflict.
              </s-paragraph>
            </s-stack>
          </s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>Weight sync</strong>
              <s-paragraph>
                If you plan to use Shopify weight-based shipping, keep eBay weights as
                packed shipping weights and keep the Shopify default package weight at 0.
              </s-paragraph>
            </s-stack>
          </s-box>
          <s-box borderWidth="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <strong>Notifications</strong>
              <s-paragraph>
                Slack notifications are optional. If a store-specific Slack Incoming
                Webhook URL is set, sync issue alerts and test alerts are sent there.
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}
