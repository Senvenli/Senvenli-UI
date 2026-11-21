import type { ExampleData, ExampleMeta } from "../examples/types";

// Build time only (".server"): the prerender reads the lists and the sources; the browser gets them as loader
// data, so the code shown on a page is never part of a JavaScript bundle.
const lists = import.meta.glob<ExampleMeta[]>("../examples/*/index.ts", { import: "default" });
const sources = import.meta.glob<string>("../examples/*/*.tsx", { query: "?raw", import: "default" });

/** The slug's examples in order, each with the source of its file. Empty when the slug has none yet. */
export async function loadExamples(slug: string): Promise<ExampleData[]> {
  const list = lists[`../examples/${slug}/index.ts`];
  if (!list) return [];
  const metas = await list();
  return Promise.all(
    metas.map(async (meta) => {
      const source = sources[`../examples/${slug}/${meta.id}.tsx`];
      if (!source) throw new Error(`examples/${slug}: "${meta.id}" is listed but ${meta.id}.tsx is missing`);
      return { ...meta, code: (await source()).trim() };
    }),
  );
}
