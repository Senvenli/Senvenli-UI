import { loadManifest } from "../lib/manifest.server";
import { manifestToMarkdown } from "../lib/twins";
import type { Route } from "./+types/component-md";

/** Spike probe: a resource route (no default export) for the Markdown twin. */
export async function loader({ params }: Route.LoaderArgs) {
  const manifest = await loadManifest(params.slug);
  if (!manifest) throw new Response(null, { status: 404 });
  return new Response(manifestToMarkdown(manifest), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
