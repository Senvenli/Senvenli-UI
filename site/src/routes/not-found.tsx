import { NotFoundPage } from "../pages/NotFoundPage";
import { NOT_FOUND_META } from "../lib/not-found-document";
import type { Route } from "./+types/not-found";

export const meta: Route.MetaFunction = () => [{ title: "Page not found · Senvenli UI" }, { name: "robots", content: "noindex" }, { name: NOT_FOUND_META, content: "404" }];

export default function NotFoundRoute() {
  return <NotFoundPage />;
}
