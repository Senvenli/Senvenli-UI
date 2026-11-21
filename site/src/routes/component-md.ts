import { loadExamples } from "../lib/examples.server";
import { loadManifest } from "../lib/manifest.server";
import { manifestToMarkdown } from "../lib/twins";
import type { Route } from "./+types/component-md";

/** The Markdown twin of /components/<slug>: a resource route, prerendered to <slug>.md. */
export async function loader({ params }: Route.LoaderArgs) {
  const manifest = await loadManifest(params.slug);
  if (!manifest) throw new Response(null, { status: 404 });
  const examples = await loadExamples(params.slug);
  return new Response(manifestToMarkdown(manifest, examples), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
