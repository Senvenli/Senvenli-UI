import { readFileSync, readdirSync } from "node:fs";
import { DesignSystemProvider } from "@senvenli/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import type { ExampleMeta } from "../src/examples/types";
import { loadExamples } from "../src/lib/examples.server";
import { listDocs, renderDoc } from "../src/lib/docs.server";
import { DocPage } from "../src/pages/DocPage";
import type { Manifest, ManifestIndexEntry } from "../src/lib/manifest";
import { ComponentPage } from "../src/pages/ComponentPage";
import { ComponentsIndexPage } from "../src/pages/ComponentsIndexPage";
import { CreatePage } from "../src/pages/CreatePage";
import { HomePage } from "../src/pages/HomePage";
import { NotFoundPage } from "../src/pages/NotFoundPage";
import { SiteShell } from "../src/pages/SiteShell";

const manifests = new URL("../../packages/react/manifests/", import.meta.url);
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, manifests), "utf8")) as T;
const index = read<ManifestIndexEntry[]>("index.json");
const lists = import.meta.glob<ExampleMeta[]>("../src/examples/*/index.ts", { import: "default", eager: true });
const examples = import.meta.glob<ComponentType>("../src/examples/*/*.tsx", { import: "default", eager: true });

// The pages are router-agnostic: without `navigate` the provider renders plain links.
const render = (page: ReactNode) =>
  renderToString(
    <DesignSystemProvider locale="en">
      <SiteShell>{page}</SiteShell>
    </DesignSystemProvider>,
  );

describe("server render", () => {
  it("runs without a browser", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("the index lists every manifest file", () => {
    const files = readdirSync(manifests).filter((file) => file !== "index.json").map((file) => file.replace(/\.json$/, ""));
    expect(index.map((entry) => entry.name).sort()).toEqual(files.sort());
  });

  it.each(index.map((entry) => entry.name))("/docs/components/%s renders", async (slug) => {
    const manifest = read<Manifest>(`${slug}.json`);
    const html = render(<ComponentPage manifest={manifest} examples={await loadExamples(slug)} components={index} />);
    expect(html).toContain(`<h1`);
    expect(html).toContain(`/docs/components/${slug}.md`);
  });

  it("every example folder belongs to a manifest, and lists exactly the files it has", () => {
    const slugs = new Set(index.map((entry) => entry.name));
    const folders = Object.keys(lists).map((key) => key.split("/")[3]!);
    expect(folders.filter((slug) => !slugs.has(slug))).toEqual([]);
    for (const slug of folders) {
      const listed = (lists[`../src/examples/${slug}/index.ts`] as ExampleMeta[]).map((meta) => meta.id).sort();
      const files = Object.keys(examples).filter((key) => key.split("/")[3] === slug).map((key) => key.split("/")[4]!.replace(/\.tsx$/, "")).sort();
      expect(files, slug).toEqual(listed);
    }
  });

  it.each(Object.keys(examples))("%s renders on the server", (key) => {
    const Example = examples[key]!;
    expect(() => render(<Example />)).not.toThrow();
  });

  it("the other pages render", () => {
    expect(render(<HomePage data={{ componentCount: index.length, families: [{ family: "action", count: 9 }], agentCode: "# Button", agentJson: "{}" }} />)).toContain("people trust");
    expect(render(<ComponentsIndexPage components={index} />)).toContain("/docs/components/button");
    expect(render(<NotFoundPage />)).toContain("Page not found");
  });

  it("/create renders the neutral theme and the production origin", () => {
    const html = render(<CreatePage />);
    expect(html).toContain("Start from");
    expect(html).not.toContain("localhost");
  });

  it("renders the same HTML twice (no clock, no random value)", () => {
    for (const key of Object.keys(examples)) {
      const Example = examples[key]!;
      expect(render(<Example />), key).toBe(render(<Example />));
    }
  });

  it.each(listDocs().map((doc) => doc.slug))("/docs/%s renders, with every code block highlighted", async (slug) => {
    const doc = (await renderDoc(slug))!;
    expect(doc.meta.title.length).toBeGreaterThan(0);
    expect(doc.meta.description.length).toBeGreaterThan(0);
    for (const part of doc.parts) if (part.kind === "code") expect(part.html, `${slug}: ${part.code.slice(0, 30)}`).toContain("shiki");
    const html = render(<DocPage {...doc} docs={listDocs()} />);
    expect(html).toContain("<h1");
    expect(html).toContain(`/docs/${slug}.md`);
  });

  it("docs link only to pages that exist", async () => {
    const slugs = new Set(index.map((entry) => entry.name));
    const docs = new Set(listDocs().map((doc) => doc.slug));
    const fixed = new Set(["/create", "/docs/components", "/llms.txt", "/schema/component.full.json"]);
    for (const doc of listDocs()) {
      const rendered = (await renderDoc(doc.slug))!;
      const html = rendered.parts.map((part) => (part.kind === "html" ? part.html : "")).join("");
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        if (/^https?:/.test(href!)) continue;
        const path = href!.split("#")[0]!;
        const ok = fixed.has(path) || (path.startsWith("/docs/") && docs.has(path.slice(6))) || (path.startsWith("/docs/components/") && slugs.has(path.slice(17)));
        expect(ok, `${doc.slug} links to ${href}`).toBe(true);
      }
    }
  });
});
