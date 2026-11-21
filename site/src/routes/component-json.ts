import { loadManifest } from "../lib/manifest.server";
import type { Route } from "./+types/component-json";

/** Spike probe: a resource route (no default export) for the JSON twin. */
export async function loader({ params }: Route.LoaderArgs) {
  const manifest = await loadManifest(params.slug);
  if (!manifest) throw new Response(null, { status: 404 });
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, { headers: { "Content-Type": "application/json" } });
}
