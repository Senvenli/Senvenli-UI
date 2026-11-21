import { data } from "react-router";
import { EXAMPLES } from "../examples";
import { loadManifest } from "../lib/manifest.server";
import { ComponentPage } from "../pages/ComponentPage";
import type { Route } from "./+types/component";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.manifest.title} · Senvenli UI` : "Senvenli UI" },
  ...(loaderData ? [{ name: "description", content: loaderData.manifest.description }] : []),
];

/** Runs at build time for every prerendered slug; the browser reads the result (inline, or <slug>.data). */
export async function loader({ params }: Route.LoaderArgs) {
  const manifest = await loadManifest(params.slug);
  if (!manifest) throw data(null, { status: 404 });
  return { manifest };
}

export default function ComponentRoute({ loaderData }: Route.ComponentProps) {
  const { manifest } = loaderData;
  return <ComponentPage manifest={manifest} example={EXAMPLES[manifest.name]?.()} />;
}
