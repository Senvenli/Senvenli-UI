import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ChartAnimation, Heatmap } from "./index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) =>
  render(
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
const COHORTS = ["Sep", "Oct"];
const WEEKS = ["W0", "W1", "W2", "W3", "W4"];
const VALUES = [1, 0.62, 0.41, 0.2, 0];
const DATA = COHORTS.flatMap((row) => WEEKS.map((column, index) => ({ row, column, value: VALUES[index]! })));
const cells = () => [...document.querySelectorAll<HTMLElement>("[data-slot='heatmap-cell']")];

describe("Heatmap scale='percent'", () => {
  it("fixed steps: above 0, 25%, 50%, 75%, the same in every row", () => {
    inLocale(<Heatmap title="Retention" rows={COHORTS} columns={WEEKS} data={DATA} scale="percent" />);
    const levels = cells().map((cell) => cell.getAttribute("data-level"));
    // 100% and 62% sit in the top two steps, 41% in the third, 20% in the first, 0 in step 0.
    expect(levels.slice(0, 5)).toEqual(["4", "3", "2", "1", "0"]);
    expect(levels.slice(5)).toEqual(levels.slice(0, 5));
  });

  it("each cell prints its percent, hidden from screen readers (its name says it), in the step's checked ink", () => {
    inLocale(<Heatmap title="Retention" rows={COHORTS} columns={WEEKS} data={DATA} scale="percent" />);
    const first = cells()[0]!;
    const figure = first.querySelector("[data-slot='heatmap-figure']")!;
    expect(figure.textContent).toBe("100%");
    expect(figure.getAttribute("aria-hidden")).toBe("true");
    expect(figure.className).toContain("text-ds-text-on-chart");
    expect(cells()[1]!.querySelector("[data-slot='heatmap-figure']")!.className).toContain("text-ds-text-on-chart-heat");
    expect(cells()[2]!.querySelector("[data-slot='heatmap-figure']")!.className).toContain("text-ds-text");
    expect(screen.getByRole("gridcell", { name: "Sep, W1: 62%" })).toBeTruthy();
  });

  it("the scale reads 0% … 100%; auto keeps Less … More and no figures", () => {
    inLocale(<Heatmap title="Retention" rows={COHORTS} columns={WEEKS} data={DATA} scale="percent" />);
    expect(document.querySelector("[data-slot='heatmap-scale']")!.textContent).toContain("0%");
    expect(document.querySelector("[data-slot='heatmap-scale']")!.textContent).toContain("100%");
    cleanup();
    inLocale(<Heatmap title="Orders" rows={COHORTS} columns={WEEKS} data={DATA} />);
    expect(document.querySelector("[data-slot='heatmap-figure']")).toBeNull();
    expect(document.querySelector("[data-slot='heatmap-scale']")!.textContent).toContain("Less");
  });
});
