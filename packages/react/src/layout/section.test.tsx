import fs from "node:fs";
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Container, Section, SectionHead } from "./index";

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lrtb]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null | undefined) => element?.getAttribute("class") ?? "";
const slot = (name: string, root: ParentNode = document) => root.querySelector(`[data-slot="${name}"]`);

function inProvider(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const band = (props: Partial<React.ComponentProps<typeof Section>> = {}) => (
  <Section {...props}>
    <Container>
      <SectionHead overline="How it works" title="Live in four steps" lead="Choose a plan, connect your domain, add your content." />
      <p>Content</p>
    </Container>
  </Section>
);

afterEach(cleanup);

describe("Section, Container, SectionHead", () => {
  it("is a section named by its head, with token rhythm: ds-space-1000 from 768px, ds-space-600 below", () => {
    inProvider(band({ id: "how-it-works" }));
    const section = screen.getByRole("region", { name: "Live in four steps" });
    expect(section.tagName).toBe("SECTION");
    expect(section.id).toBe("how-it-works");
    expect(classesOf(section).split(/\s+/)).toEqual(expect.arrayContaining(["bg-ds-surface", "py-ds-600", "min-[768px]:py-ds-1000", "w-full"]));
    // Anchor scrolling leaves room for the 56px sticky Navbar, composed from tokens.
    expect(classesOf(section)).toContain("scroll-mt-[calc(var(--ds-space-600)+var(--ds-space-100))]");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Live in four steps");
  });

  it("has a sunken tone and a compact density", () => {
    inProvider(band({ tone: "sunken", density: "compact" }));
    const section = slot("section");
    expect(classesOf(section)).toContain("bg-ds-surface-sunken");
    expect(classesOf(section)).toContain("py-ds-600");
    expect(classesOf(section)).not.toContain("min-[768px]:py-ds-1000");
  });

  it("caps the column at 1200px (800px narrow) with a ds-space-300 / ds-space-200 gutter and a ds-space-400 gap", () => {
    inProvider(
      <>
        <Section><Container><p>a</p></Container></Section>
        <Section><Container width="narrow"><p>b</p></Container></Section>
      </>,
    );
    const [wide, narrow] = Array.from(document.querySelectorAll('[data-slot="container"]'));
    expect(classesOf(wide).split(/\s+/)).toEqual(expect.arrayContaining(["mx-auto", "max-w-[1200px]", "px-ds-200", "min-[768px]:px-ds-300", "gap-ds-400", "flex-col"]));
    expect(classesOf(narrow)).toContain("max-w-[800px]");
  });

  it("spaces only with token padding and gap, never sibling margins", () => {
    inProvider(<>{band()}{band({ tone: "sunken" })}</>);
    for (const part of Array.from(document.querySelectorAll("[data-slot]"))) {
      for (const utility of classesOf(part).split(/\s+/)) {
        // mx-auto centres the column (and a centred head); m-0 resets heading margins.
        if (utility === "mx-auto" || utility === "m-0") continue;
        expect(utility, part.getAttribute("data-slot") ?? "").not.toMatch(/^(?:[a-z0-9[\]-]+:)?-?m[xytblrse]?-/);
        const spacing = /^(?:[a-z0-9[\]-]+:)?(?:p[xy]?|gap)-(.+)$/.exec(utility);
        if (spacing) expect(spacing[1], utility).toMatch(/^ds-\d+$/);
        const color = /(?:^|:)(?:bg|text)-(ds-(?:surface|text|background)[a-z-]*)$/.exec(utility);
        if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
      }
    }
  });

  it("has the overline, a display-medium title and a 60ch lead, start-aligned or centred", () => {
    inProvider(
      <Section>
        <Container width="narrow">
          <SectionHead title="Your team. Your region. One platform." titleSize="heading-xxlarge" titleLevel={3} align="center" />
        </Container>
      </Section>,
    );
    const head = slot("section-head");
    expect(classesOf(head).split(/\s+/)).toEqual(expect.arrayContaining(["items-center", "text-center", "gap-ds-150"]));
    expect(screen.getByRole("heading", { level: 3 }).getAttribute("data-size")).toBe("heading-xxlarge");
    expect(slot("section-overline")).toBeNull();
    cleanup();
    inProvider(band());
    expect(classesOf(slot("section-overline"))).toContain("text-ds-text-brand");
    // Sentence case like every label: the overline is never uppercased; lang keeps the locale's own rules for the text.
    expect(classesOf(slot("section-overline"))).not.toContain("uppercase");
    expect(slot("section-overline")?.textContent).toBe("How it works");
    expect(slot("section-overline")?.getAttribute("lang")).toBe("en");
    expect(classesOf(slot("section-head"))).toContain("max-w-[720px]");
    expect(classesOf(slot("section-lead")).split(/\s+/)).toEqual(expect.arrayContaining(["max-w-[60ch]", "text-body-large", "text-ds-text-subtle"]));
    expect(screen.getByRole("heading", { level: 2 }).getAttribute("data-size")).toBe("display-medium");
    expect(classesOf(slot("section-head"))).toContain("text-start");
  });

  it("renders progressively without dropping content from the server HTML", () => {
    const html = renderToString(<DesignSystemProvider locale="en" navigate={vi.fn()}>{band({ progressive: true })}</DesignSystemProvider>);
    expect(html).toContain("Live in four steps");
    expect(html).toContain("Content");
    inProvider(band({ progressive: true }));
    const section = slot("section");
    // Reserved size keeps the layout from shifting; nothing animates, so reduced motion needs nothing.
    expect(classesOf(section).split(/\s+/)).toEqual(expect.arrayContaining(["[content-visibility:auto]", "[contain-intrinsic-size:auto_720px]"]));
    expect(classesOf(section)).not.toMatch(/animate|transition/);
    cleanup();
    inProvider(band());
    expect(classesOf(slot("section"))).not.toContain("content-visibility");
  });

  it("names itself only from one head: a second head never repeats the id, and takes over when the first goes", () => {
    const ui = (first: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Section>
          <Container>
            {first && <SectionHead title="First" />}
            <SectionHead title="Second" titleLevel={3} />
          </Container>
        </Section>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    const ids = Array.from(document.querySelectorAll("h2[id], h3[id]")).map((heading) => heading.id);
    expect(ids).toHaveLength(1);
    expect(screen.getByRole("region", { name: "First" })).toBeTruthy();
    rerender(ui(false));
    expect(screen.getByRole("region", { name: "Second" })).toBeTruthy();
  });

  it("server-renders without a name (no mismatch), then loses it again when the head goes", () => {
    const html = renderToString(<DesignSystemProvider locale="en" navigate={vi.fn()}>{band()}</DesignSystemProvider>);
    expect(html).not.toContain("aria-labelledby");
    const ui = (withHead: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Section><Container>{withHead && <SectionHead title="Title" />}<p>x</p></Container></Section>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    expect(slot("section")?.hasAttribute("aria-labelledby")).toBe(true);
    rerender(ui(false));
    expect(slot("section")?.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("takes a given name, and has none without a head", () => {
    inProvider(
      <>
        <h2 id="outside">Outside heading</h2>
        <Section aria-labelledby="outside"><Container><p>x</p></Container></Section>
        <Section><Container><p>y</p></Container></Section>
      </>,
    );
    const [named, plain] = Array.from(document.querySelectorAll("section"));
    expect(named.getAttribute("aria-labelledby")).toBe("outside");
    expect(plain.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("uses logical properties only, so RTL needs no override", () => {
    const { container } = inProvider(<div dir="rtl">{band({ tone: "sunken", progressive: true })}</div>);
    for (const part of Array.from(container.querySelectorAll("[data-slot]"))) {
      expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    }
  });
});
