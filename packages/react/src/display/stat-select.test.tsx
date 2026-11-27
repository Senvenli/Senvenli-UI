import fs from "node:fs";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTheme, toCSS } from "@senvenli/tokens";
import { DesignSystemProvider } from "../provider";
import { Stat, StatGroup } from "./index";

afterEach(cleanup);

const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");

function tiles(props: Partial<React.ComponentProps<typeof StatGroup>> = {}) {
  return render(
    <DesignSystemProvider locale="en">
      <StatGroup aria-label="Metric" selectionMode="single" {...props}>
        <Stat id="visitors" label="Visitors" value="12,480" delta={{ value: "4%", direction: "up" }} comparison="vs. last week" />
        <Stat id="views" label="Views" value="40,112" />
        <Stat id="bounce" label="Bounce rate" value="41%" />
      </StatGroup>
    </DesignSystemProvider>,
  );
}

describe("StatGroup selection", () => {
  it("single: a named radio group, the tile named by its label and figure", () => {
    const onSelectionChange = vi.fn();
    tiles({ defaultSelectedKeys: ["visitors"], onSelectionChange, disallowEmptySelection: true });
    const group = screen.getByRole("radiogroup", { name: "Metric" });
    expect(group.getAttribute("data-slot")).toBe("stat-group");
    const visitors = screen.getByRole("radio", { name: "Visitors 12,480" });
    expect(visitors.getAttribute("aria-checked")).toBe("true");
    expect(visitors.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Views 40,112" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["views"]));
    expect(screen.getByRole("radio", { name: "Views 40,112" }).getAttribute("aria-checked")).toBe("true");
    expect(visitors.getAttribute("aria-checked")).toBe("false");
  });

  it("single: arrow keys move focus between tiles", () => {
    tiles({ defaultSelectedKeys: ["visitors"] });
    const visitors = screen.getByRole("radio", { name: "Visitors 12,480" });
    visitors.focus();
    fireEvent.keyDown(visitors, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Views 40,112" }));
  });

  it("multiple: each tile is a pressed toggle, controlled by selectedKeys", () => {
    const onSelectionChange = vi.fn();
    tiles({ selectionMode: "multiple", selectedKeys: ["visitors", "bounce"], onSelectionChange });
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false", "true"]);
    fireEvent.click(buttons[1]!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["visitors", "bounce", "views"]));
  });

  it("selected is a ring as well as a fill, from theme tokens", () => {
    tiles({ defaultSelectedKeys: ["visitors"] });
    const classes = screen.getByRole("radio", { name: "Visitors 12,480" }).getAttribute("class") ?? "";
    expect(classes).toContain("data-[selected]:inset-ring-ds-border-selected");
    expect(classes).toContain("data-[selected]:bg-ds-background-selected");
    for (const token of ["ds-border-selected", "ds-background-selected"]) expect(theme).toContain(`--color-${token}:`);
  });

  it("drops href in a selectable group with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <DesignSystemProvider locale="en">
        <StatGroup aria-label="Metric" selectionMode="single">
          <Stat id="a" label="A" value="1" href="/a" />
        </StatGroup>
      </DesignSystemProvider>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("radio", { name: "A 1" })).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("href is ignored"));
    warn.mockRestore();
  });

  it("without selectionMode a Stat stays a plain tile", () => {
    render(
      <DesignSystemProvider locale="en">
        <StatGroup aria-label="Summary">
          <Stat id="a" label="A" value="1" />
        </StatGroup>
      </DesignSystemProvider>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("group", { name: "Summary" })).toBeTruthy();
  });
});
