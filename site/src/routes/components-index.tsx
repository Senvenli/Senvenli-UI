import { loadIndex } from "../lib/manifest.server";
import { ComponentsIndexPage } from "../pages/ComponentsIndexPage";
import type { Route } from "./+types/components-index";

export const meta: Route.MetaFunction = () => [{ title: "Components · Senvenli UI" }];

export async function loader() {
  return { components: await loadIndex() };
}

export default function ComponentsIndexRoute({ loaderData }: Route.ComponentProps) {
  return <ComponentsIndexPage components={loaderData.components} />;
}
