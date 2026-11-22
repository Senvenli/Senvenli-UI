import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action/index";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { EmptyState } from "./index";
import { Badge } from "../display/badge";

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

function inProvider(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** Every ds colour utility on the element resolves to a theme token. */
function expectTokens(element: Element | null) {
  for (const utility of classesOf(element).split(/\s+/)) {
    const color = /^(?:bg|text|ring)-(ds-(?:background|surface|icon|text|border)[a-z-]*)$/.exec(utility);
    if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
  }
}

afterEach(cleanup);

describe("EmptyState", () => {
  it("shows one icon, the title, the reason and the actions that fill the view", () => {
    const create = vi.fn();
    inProvider(
      <EmptyState
        icon="calendar-plus"
        title="No orders yet"
        description="Orders are listed here as they come in from your site and other channels."
        primaryAction={<Button variant="primary" iconBefore="plus" onPress={create}>Create order</Button>}
        secondaryAction={<Button variant="subtle">Open site</Button>}
      />,
    );
    expect(slot("empty-state-icon")?.querySelectorAll("svg")).toHaveLength(1);
    expect(slot("empty-state-icon")?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(classesOf(slot("empty-state-title"))).toContain("text-heading-small");
    expect(classesOf(slot("empty-state-description"))).toContain("text-ds-text-subtle");
    const buttons = Array.from(slot("empty-state-actions")?.querySelectorAll("button") ?? []).map((button) => button.textContent);
    expect(buttons).toEqual(["Create order", "Open site"]);
    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    expect(create).toHaveBeenCalled();
    // Calm by design: no live announcement for an empty view.
    expect(slot("empty-state")?.hasAttribute("role")).toBe(false);
  });

  it("has a small size for tables and cards", () => {
    inProvider(<EmptyState size="small" icon="search-x" title="No items match “ZZ-9”" description="Check the code or clear the filters." />);
    expect(slot("empty-state")?.getAttribute("data-size")).toBe("small");
    expect(classesOf(slot("empty-state"))).toContain("py-ds-300");
    expect(classesOf(slot("empty-state-title"))).toContain("text-body-strong");
    expect(classesOf(slot("empty-state-description"))).toContain("text-body-small");
    expect(slot("empty-state-actions")).toBeNull();
  });

  it("renders the title as a heading when asked, and no empty description", () => {
    inProvider(<EmptyState icon="inbox" title="Nothing due today" headingLevel={2} description={null} />);
    expect(screen.getByRole("heading", { level: 2, name: "Nothing due today" })).toBeTruthy();
    expect(slot("empty-state-description")).toBeNull();
  });

  it("uses only theme tokens on the tile", () => {
    inProvider(<EmptyState icon="inbox" title="Nothing due today" />);
    expectTokens(slot("empty-state-icon"));
    expect(classesOf(slot("empty-state-icon"))).toContain("bg-ds-surface-sunken");
  });
});

describe("EmptyState tone=danger (a failed load)", () => {
  it("shows the danger icon, the details inside the announced message, and the actions outside it", () => {
    inProvider(
      <EmptyState
        tone="danger"
        icon="cloud-off"
        announce
        title="Reports could not be loaded"
        description="Check your connection and try again."
        details={<span className="font-ds-mono">Error code: RPT-504</span>}
        primaryAction={<Button iconBefore="rotate-cw">Retry</Button>}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Reports could not be loaded");
    expect(alert.textContent).toContain("RPT-504");
    expect(alert.textContent).not.toContain("Retry");
    expect(classesOf(slot("empty-state-icon"))).toContain("bg-ds-background-danger");
    expectTokens(slot("empty-state-icon"));
  });

  it("announces nothing unless asked: a first-use state is no alert", () => {
    inProvider(<EmptyState icon="inbox" title="No invoices yet" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Badge variant=dot (the live state dot)", () => {
  it("is a dot and a word, the dot hidden from screen readers", () => {
    inProvider(
      <>
        <Badge variant="dot" tone="success" isLive>Online</Badge>
        <Badge variant="dot" tone="danger">No connection</Badge>
        <Badge variant="dot">Inactive</Badge>
      </>,
    );
    const dots = Array.from(document.querySelectorAll('[data-slot="badge"]'));
    expect(dots.map((dot) => dot.textContent)).toEqual(["Online", "No connection", "Inactive"]);
    for (const mark of Array.from(document.querySelectorAll('[data-slot="badge-dot"]'))) {
      expect(mark.getAttribute("aria-hidden")).toBe("true");
      expect(classesOf(mark)).toContain("size-ds-100");
      expectTokens(mark);
    }
    expect(dots[2].getAttribute("data-tone")).toBe("neutral");
  });

  it("shows the halo only for a live state, in the tone's status background", () => {
    inProvider(
      <>
        <Badge variant="dot" tone="success" isLive>Online</Badge>
        <Badge variant="dot" tone="information">Syncing</Badge>
      </>,
    );
    const [live, idle] = Array.from(document.querySelectorAll('[data-slot="badge-dot"]'));
    expect(classesOf(live)).toContain("ring-3");
    expect(classesOf(live)).toContain("ring-ds-background-success");
    expect(classesOf(live)).toContain("bg-ds-icon-success");
    expect(classesOf(idle)).not.toContain("ring-3");
    expect(document.querySelectorAll('[data-live]')).toHaveLength(1);
  });

  it("is a named image when no word fits", () => {
    inProvider(<Badge variant="dot" tone="warning" aria-label="Signal delayed" />);
    expect(screen.getByRole("img", { name: "Signal delayed" })).toBeTruthy();
  });

  it("never renders an empty word next to the dot", () => {
    inProvider(<Badge variant="dot" tone="success">{null}</Badge>);
    expect(slot("badge-label")).toBeNull();
    // No word and no label: decorative, never an unnamed image.
    expect(slot("badge")?.hasAttribute("role")).toBe(false);
    expect(slot("badge")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the word clear of the live halo", () => {
    inProvider(
      <>
        <Badge variant="dot" tone="success" isLive>Online</Badge>
        <Badge variant="dot" tone="success">Online</Badge>
      </>,
    );
    const [live, idle] = Array.from(document.querySelectorAll('[data-slot="badge"]'));
    expect(classesOf(live)).toContain("gap-ds-100");
    expect(classesOf(idle)).toContain("gap-ds-075");
  });
});

describe("strings and direction", () => {
  it("renders every part with logical classes and centred in RTL", () => {
    const { container } = inProvider(
      <div dir="rtl">
        <EmptyState icon="inbox" title="ا" description="ب" primaryAction={<Button>ج</Button>} />
        <EmptyState tone="danger" icon="cloud-off" title="د" description="ه" details={<bdi data-slot="code">X-1</bdi>} primaryAction={<Button iconBefore="rotate-cw">ز</Button>} />
        <Badge variant="dot" tone="success" isLive>و</Badge>
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(12);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    expect(classesOf(slot("empty-state"))).toContain("text-center");
  });
});

describe("page-level states", () => {
  it("a state that is the whole page takes the page's h1", () => {
    inProvider(<EmptyState tone="danger" icon="file-question" headingLevel={1} title="Page not found" description="Go back to the home page." primaryAction={<span>Home</span>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
  });
});
