import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { AreaChart, BarChart, ChartAnimation, LineChart } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: { width: 640, height: 240, top: 0, left: 0, right: 640, bottom: 240, x: 0, y: 0 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 240 });
});
afterEach(cleanup);

const inLocale = (ui: React.ReactElement) =>
  render(
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
const MRR = [
  { month: "Jul", mrr: 8200 },
  { month: "Aug", mrr: 9100 },
  { month: "Sep", mrr: 10400 },
];
const lines = () => [...document.querySelectorAll(".recharts-reference-line-line")];
const text = () => [...document.querySelectorAll(".recharts-surface text")].map((node) => node.textContent);
// Every number the chart writes (tick labels included): the axis reaches the goal when one of them is at or above it.
const numbers = () => text().map((value) => Number(String(value).replace(/[^\d.]/g, ""))).filter((value) => Number.isFinite(value));

describe("reference lines", () => {
  it("AreaChart draws them as Line and Bar do", () => {
    inLocale(<AreaChart title="MRR" data={MRR} index="month" categories={["mrr"]} referenceLines={[{ value: 9000, label: "Goal" }]} />);
    expect(lines()).toHaveLength(1);
    expect(lines()[0]!.getAttribute("stroke")).toBe("var(--ds-border-bold)");
    expect(text()).toContain("Goal");
  });

  it("a goal above the data is drawn: the value axis reaches it (Area, Line, Bar)", () => {
    for (const ui of [
      <AreaChart key="a" title="MRR" data={MRR} index="month" categories={["mrr"]} referenceLines={[{ value: 15000, label: "Goal" }]} />,
      <LineChart key="l" title="MRR" data={MRR} index="month" categories={["mrr"]} referenceLines={[{ value: 15000, label: "Goal" }]} />,
      <BarChart key="b" title="MRR" data={MRR} index="month" categories={["mrr"]} referenceLines={[{ value: 15000, label: "Goal" }]} />,
    ]) {
      inLocale(ui);
      expect(lines()).toHaveLength(1);
      expect(Math.max(...numbers())).toBeGreaterThanOrEqual(15000);
      cleanup();
    }
  });

  it("two lines with the same label are both drawn", () => {
    inLocale(<LineChart title="MRR" data={MRR} index="month" categories={["mrr"]} referenceLines={[{ value: 9000, label: "Goal" }, { value: 10000, label: "Goal" }]} />);
    expect(lines()).toHaveLength(2);
  });
});
