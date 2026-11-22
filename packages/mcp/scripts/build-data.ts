// Bundles what the MCP server serves into data/registry.json: every component's manifest, its examples' source and
// its Markdown page (the same text as the site's /components/<name>.md), and every doc's Markdown.
// Run with Node's type stripping: `node scripts/build-data.ts`. Deterministic: no timestamps, sorted keys stay as built.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { manifestToMarkdown } from "../../../site/src/lib/twins.ts";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const manifests = here("../../react/manifests/");
const examples = here("../../../site/src/examples/");
const docs = here("../../../site/content/docs/");

type Meta = { id: string; title: string; description?: string; align?: string };

const index = JSON.parse(readFileSync(`${manifests}index.json`, "utf8")) as { name: string }[];
const components = [];
for (const { name } of index) {
  const manifest = JSON.parse(readFileSync(`${manifests}${name}.json`, "utf8"));
  let metas: Meta[] = [];
  try {
    metas = (await import(`${examples}${name}/index.ts`)).default as Meta[];
  } catch {
    metas = [];
  }
  const exampleData = metas.map((meta) => ({ id: meta.id, title: meta.title, description: meta.description, code: readFileSync(`${examples}${name}/${meta.id}.tsx`, "utf8").trim() }));
  components.push({
    name,
    title: manifest.title,
    family: manifest.family,
    description: manifest.description,
    keywords: manifest.keywords,
    import: manifest.import,
    exports: manifest.exports,
    manifest,
    markdown: manifestToMarkdown(manifest, exampleData),
    examples: exampleData,
  });
}

const docList = readdirSync(docs)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const markdown = readFileSync(`${docs}${file}`, "utf8");
    const front = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const field = (key: string) => front.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";
    return { slug: file.replace(/\.md$/, ""), title: field("title"), description: field("description"), group: field("group"), order: Number(field("order") || 99), markdown };
  })
  .sort((a, b) => a.order - b.order);

const react = JSON.parse(readFileSync(here("../../react/package.json"), "utf8")) as { version: string };
mkdirSync(here("../data"), { recursive: true });
writeFileSync(here("../data/registry.json"), `${JSON.stringify({ reactVersion: react.version, components, docs: docList })}\n`);
console.log(`registry: ${components.length} components, ${components.reduce((n, c) => n + c.examples.length, 0)} examples, ${docList.length} docs`);
