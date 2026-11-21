import type { Manifest, ManifestIndexEntry } from "./manifest";

// Build time only (".server"): the prerender reads these, the browser gets the result as loader data.
const files = import.meta.glob<Manifest>("../../../packages/react/manifests/*.json", { import: "default" });
const path = (slug: string) => `../../../packages/react/manifests/${slug}.json`;

export async function loadManifest(slug: string): Promise<Manifest | null> {
  const load = slug === "index" ? undefined : files[path(slug)];
  return load ? load() : null;
}

export async function loadIndex(): Promise<ManifestIndexEntry[]> {
  const index = (await files[path("index")]!()) as unknown as ManifestIndexEntry[];
  return index.map(({ name, title, family, status, description }) => ({ name, title, family, status, description }));
}
