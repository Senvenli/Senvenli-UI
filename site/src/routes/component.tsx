import { data } from "react-router";
import { loadExamples } from "../lib/examples.server";
import { highlight } from "../lib/highlight.server";
import { importStatement, orderComponents } from "../lib/manifest";
import { loadIndex, loadManifest } from "../lib/manifest.server";
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
  const importLine = importStatement(manifest.exports, manifest.import);
  const [examples, index, importHtml] = await Promise.all([loadExamples(params.slug), loadIndex(), highlight(importLine)]);
  return { manifest, examples, components: orderComponents(index), importHtml };
}

export default function ComponentRoute({ loaderData }: Route.ComponentProps) {
  return <ComponentPage {...loaderData} />;
}
