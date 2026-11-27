import fs from "node:fs";
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTheme, toCSS } from "@senvenli/tokens";
import { DesignSystemProvider } from "../provider";
import { Stat, StatGroup } from "./index";

afterEach(cleanup);
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

describe("StatGroup label", () => {
  it("shows a visible name that also names the group", () => {
    inLocale(
      <StatGroup label="Business">
        <Stat label="MRR" value="$12,400" />
      </StatGroup>,
    );
    expect(slot("stat-group-label").textContent).toBe("Business");
    expect(screen.getByRole("group", { name: "Business" })).toBe(slot("stat-group"));
  });

  it("names a selectable group too; an explicit aria-labelledby wins", () => {
    inLocale(
      <>
        <span id="own">Chart metric</span>
        <StatGroup label="Website" aria-labelledby="own" selectionMode="single">
          <Stat id="v" label="Visitors" value="1,204" />
        </StatGroup>
      </>,
    );
    expect(screen.getByRole("radiogroup", { name: "Chart metric" })).toBeTruthy();
  });

  it("without label or density the markup is as before", () => {
    inLocale(
      <StatGroup aria-label="Summary">
        <Stat label="A" value="1" />
      </StatGroup>,
    );
    expect(document.querySelector("[data-slot='stat-group-frame']")).toBeNull();
    expect(document.querySelector("[data-slot='stat-group-surface']")).toBeNull();
    expect(slot("stat").className).toContain("shadow-ds-raised");
  });
});

describe("StatGroup density compact", () => {
  it("tiles share one surface, divided by lines, up to six in a row, with a smaller figure", () => {
    inLocale(
      <StatGroup label="Website" density="compact">
        {["Visitors", "Views", "Bounce", "Duration", "Events", "Sessions"].map((name) => (
          <Stat key={name} label={name} value="1" />
        ))}
      </StatGroup>,
    );
    const surface = slot("stat-group-surface");
    expect(surface.className).toContain("shadow-ds-raised");
    expect(surface.className).toContain("overflow-hidden");
    const group = slot("stat-group");
    expect(group.getAttribute("data-density")).toBe("compact");
    expect(group.className).toContain("calc(100%_/_6)");
    const tile = slot("stat");
    expect(tile.className).toContain("border-e");
    expect(tile.className).not.toContain("shadow-ds-raised");
    expect(slot("stat-value").className).toContain("text-metric-medium");
    for (const token of ["--color-ds-border:", "--text-metric-medium:"]) expect(theme).toContain(token);
  });

  it("a compact selectable tile shows hover as a fill, not a lifted shadow", () => {
    inLocale(
      <StatGroup aria-label="Metric" density="compact" selectionMode="single">
        <Stat id="a" label="A" value="1" />
      </StatGroup>,
    );
    const tile = screen.getByRole("radio", { name: "A 1" });
    expect(tile.className).toContain("data-[hovered]:bg-ds-surface-hovered");
    expect(tile.className).not.toContain("data-[hovered]:shadow-ds-overlay");
  });
});
