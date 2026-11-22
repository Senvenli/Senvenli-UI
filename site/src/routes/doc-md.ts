import { docSource } from "../lib/docs.server";
import type { Route } from "./+types/doc-md";

/** The Markdown twin of /docs/<slug>: the doc's own source, prerendered to <slug>.md. */
export async function loader({ params }: Route.LoaderArgs) {
  const source = docSource(params.slug);
  if (source === null) throw new Response(null, { status: 404 });
  return new Response(source, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
