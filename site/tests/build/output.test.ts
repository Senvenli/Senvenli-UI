import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Run after `pnpm build`: the prerendered output nginx serves. Every component has its page and both twins.
const here = (file: string) => fileURLToPath(new URL(file, import.meta.url));
const client = here("../../build/client/");
const index = JSON.parse(readFileSync(here("../../../packages/react/manifests/index.json"), "utf8")) as { name: string }[];

describe("build output", () => {
  it("has been built", () => {
    expect(existsSync(`${client}index.html`), "run `pnpm build` first").toBe(true);
  });

  it.each(index.map((entry) => entry.name))("%s has its page, Markdown and JSON", (slug) => {
    const html = readFileSync(`${client}components/${slug}/index.html`, "utf8");
    expect(html).toContain("<h1");
    expect(readFileSync(`${client}components/${slug}.md`, "utf8")).toMatch(/^# /);
    expect(JSON.parse(readFileSync(`${client}components/${slug}.json`, "utf8")).name).toBe(slug);
  });

  it("has every doc as a page and its Markdown", () => {
    for (const file of readdirSync(here("../../content/docs/")).filter((name) => name.endsWith(".md"))) {
      const slug = file.replace(/\.md$/, "");
      expect(readFileSync(`${client}docs/${slug}/index.html`, "utf8")).toContain("<h1");
      expect(readFileSync(`${client}docs/${slug}.md`, "utf8")).toMatch(/^---\ntitle: /);
    }
  });

  it("has the fixed pages, the 404 and the schema", () => {
    for (const file of ["index.html", "create/index.html", "components/index.html", "404.html", "schema/component.full.json", "llms.txt"]) {
      expect(existsSync(`${client}${file}`), file).toBe(true);
    }
  });

  it("keeps each page's navigation data, drops the twins' unused copies and the server bundle", () => {
    expect(existsSync(here("../../build/server"))).toBe(false);
    expect(existsSync(`${client}components/button.data`)).toBe(true);
    expect(existsSync(`${client}components/button.json.data`)).toBe(false);
    expect(existsSync(`${client}components/button.md.data`)).toBe(false);
  });
});
