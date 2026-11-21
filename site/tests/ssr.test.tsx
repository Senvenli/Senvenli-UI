import { readFileSync, readdirSync } from "node:fs";
import { DesignSystemProvider } from "@senvenli/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../src/examples";
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

  it.each(index.map((entry) => entry.name))("/components/%s renders", (slug) => {
    const manifest = read<Manifest>(`${slug}.json`);
    const html = render(<ComponentPage manifest={manifest} example={EXAMPLES[slug]?.()} />);
    expect(html).toContain(`<h1`);
    expect(html).toContain(`/components/${slug}.md`);
  });

  it("every example belongs to a manifest", () => {
    const slugs = new Set(index.map((entry) => entry.name));
    expect(Object.keys(EXAMPLES).filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it("the other pages render", () => {
    expect(render(<HomePage componentCount={index.length} />)).toContain("Senvenli UI");
    expect(render(<ComponentsIndexPage components={index} />)).toContain("/components/button");
    expect(render(<NotFoundPage />)).toContain("Page not found");
  });

  it("/create renders the neutral theme and the production origin", () => {
    const html = render(<CreatePage />);
    expect(html).toContain("Start from");
    expect(html).not.toContain("localhost");
  });

  it("renders the same HTML twice (no clock, no random value)", () => {
    for (const slug of ["calendar", "timeline", "area-chart"]) {
      const page = () => render(<ComponentPage manifest={read<Manifest>(`${slug}.json`)} example={EXAMPLES[slug]?.()} />);
      expect(page()).toBe(page());
    }
  });
});
