import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A helper, not an inline `new URL(…, import.meta.url)`: bundlers (Vite in tests) rewrite the inline form into an asset URL.
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export type Example = { id: string; title: string; description?: string; code: string };
export type Component = {
  name: string;
  title: string;
  family: string;
  description: string;
  keywords: string[];
  import: string;
  exports: string[];
  manifest: Record<string, unknown> & {
    usage?: { when?: string[]; instead?: { use: string; when: string }[] };
    guidance?: { rule: string }[];
  };
  markdown: string;
  examples: Example[];
};
export type Doc = { slug: string; title: string; description: string; group: string; order: number; markdown: string };
export type Registry = { reactVersion: string; components: Component[]; docs: Doc[] };

let cached: Registry | null = null;

/** The bundled data (data/registry.json, built from the manifests, examples and docs). Read once. */
export function registry(): Registry {
  cached ??= JSON.parse(readFileSync(here("../data/registry.json"), "utf8")) as Registry;
  return cached;
}

export const findComponent = (name: string) => registry().components.find((item) => item.name === name.trim().toLowerCase());
export const findDoc = (slug: string) => registry().docs.find((item) => item.slug === slug.trim().toLowerCase());
