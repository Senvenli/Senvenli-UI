import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Split } from "./index";

afterEach(cleanup);

const classes = (element: Element) => element.className.split(/\s+/);

describe("Split", () => {
  it("is a container whose grid sets the ratio as columns above the collapse width, with panes in source order", () => {
    const { container } = render(
      <Split ratio="1.05fr 1fr" collapseBelow="64rem">
        <Split.Pane as="aside">Brand</Split.Pane>
        <Split.Pane as="main" align="center">Form</Split.Pane>
      </Split>,
    );
    const root = container.querySelector("[data-slot='split']")!;
    expect(classes(root)).toContain("@container");
    const grid = container.querySelector<HTMLElement>("[data-slot='split-grid']")!;
    expect(classes(grid)).toContain("@5xl:grid-cols-(--ds-split-columns)");
    expect(grid.style.getPropertyValue("--ds-split-columns")).toBe("1.05fr 1fr");
    expect([...grid.children].map((pane) => pane.tagName)).toEqual(["ASIDE", "MAIN"]);
    expect(classes(screen.getByRole("main"))).toEqual(expect.arrayContaining(["items-center", "justify-center"]));
  });

  it("hides the chosen pane only below the collapse width, and nothing by default", () => {
    const { container, rerender } = render(
      <Split>
        <Split.Pane>A</Split.Pane>
        <Split.Pane>B</Split.Pane>
      </Split>,
    );
    const grid = () => container.querySelector("[data-slot='split-grid']")!;
    expect(classes(grid()).some((name) => name.includes(":hidden"))).toBe(false);
    expect(classes(grid())).toContain("@3xl:grid-cols-(--ds-split-columns)");
    rerender(
      <Split hideOnNarrow="start" collapseBelow="80rem">
        <Split.Pane>A</Split.Pane>
        <Split.Pane>B</Split.Pane>
      </Split>,
    );
    expect(classes(grid())).toContain("@max-7xl:[&>[data-slot=split-pane]:first-child]:hidden");
  });

  it("fills the viewport height only when asked, and takes a token gap and pane grounds", () => {
    const { container } = render(
      <Split fullHeight space="space-300">
        <Split.Pane background="surface-sunken" padding="space-400">A</Split.Pane>
        <Split.Pane>B</Split.Pane>
      </Split>,
    );
    expect(classes(container.querySelector("[data-slot='split']")!)).toContain("min-h-svh");
    expect(container.querySelector("[data-slot='split-grid']")!.className).toMatch(/gap-/);
    expect(container.querySelector("[data-slot='split-pane']")!.className).toMatch(/bg-ds-surface-sunken/);
  });
});
