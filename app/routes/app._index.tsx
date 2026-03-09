import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async (_args: LoaderFunctionArgs) => {
  throw redirect("/app/sync");
};

export default function AppIndexRedirect() {
  return null;
}
