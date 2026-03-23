import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { AppHomeContent } from "../components/AppHomeContent";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndexPage() {
  return <AppHomeContent />;
}
