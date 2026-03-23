import type { LoaderFunctionArgs } from "react-router";
import { AppHomeContent } from "../components/AppHomeContent";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function SettingsPage() {
  return <AppHomeContent variant="settings" />;
}
