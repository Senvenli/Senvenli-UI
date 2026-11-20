import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { valueAxisTicks } from "./axis-width";
import { AreaChart, BarChart, ChartAnimation, LineChart } from "./index";

/**
 * Whole value steps for counts. A chart of small counts (new customers per month, 0–2) drew its
 * value axis at 0 / 0.7 / 1.4 / 2.1: fractions of a customer. `allowDecimals={false}` keeps the steps whole, both
 * where Recharts draws them and where the DS sizes and formats the axis. The default is unchanged.
 */

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

function inLocale(ui: React.ReactElement) {
  return render(
    <DesignSystemProvider locale="en-US" navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

const yTicks = () => [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].map((tick) => tick.textContent);
const xTicks = () => [...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map((tick) => tick.textContent);
const isWhole = (text: string | null) => /^\d+$/.test(text ?? "");

const SIGNUPS = [
  { month: "May", count: 0 },
  { month: "Jun", count: 0 },
  { month: "Nov", count: 2 },
];
const count = (value: number) => String(value);

describe("valueAxisTicks with whole steps", () => {
  it("keeps the fractional steps by default", () => {
    expect(valueAxisTicks([0, 2], 4)).toEqual([0, 0.7, 1.4, 2.1]);
  });

  it("steps by whole numbers when decimals are not allowed", () => {
    const ticks = valueAxisTicks([0, 2], 4, false);
    expect(ticks.every(Number.isInteger)).toBe(true);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)!).toBeGreaterThanOrEqual(2);
  });

  it("leaves large counts on their usual nice steps", () => {
    expect(valueAxisTicks([41_000, 58_000], 4, false)).toEqual(valueAxisTicks([41_000, 58_000], 4));
  });
});

describe("charts with allowDecimals={false}", () => {
  it("BarChart draws whole value ticks for small counts", () => {
    inLocale(<BarChart title="New customers" data={SIGNUPS} index="month" categories={["count"]} valueFormatter={count} allowDecimals={false} />);
    expect(yTicks().length).toBeGreaterThan(1);
    expect(yTicks().every(isWhole)).toBe(true);
  });

  it("BarChart keeps fractional ticks by default", () => {
    inLocale(<BarChart title="New customers" data={SIGNUPS} index="month" categories={["count"]} valueFormatter={count} />);
    expect(yTicks()).toContain("0.7");
  });

  it("horizontal bars put whole steps on their value axis", () => {
    inLocale(<BarChart title="By plan" data={SIGNUPS} index="month" categories={["count"]} layout="horizontal" sortBy="none" valueFormatter={count} allowDecimals={false} />);
    const values = xTicks().filter((text) => text !== null && /^[\d.]+$/.test(text));
    expect(values.length).toBeGreaterThan(1);
    expect(values.every(isWhole)).toBe(true);
  });

  it("percent bars keep their 0–100% steps", () => {
    inLocale(<BarChart title="Share" data={[{ month: "May", a: 1, b: 3 }]} index="month" categories={["a", "b"]} type="percent" allowDecimals={false} />);
    expect(yTicks()[0]).toMatch(/^0\s?%$/);
    expect(yTicks().at(-1)).toMatch(/^100\s?%$/);
  });

  it("AreaChart and LineChart draw whole value ticks", () => {
    inLocale(<AreaChart title="New customers" data={SIGNUPS} index="month" categories={["count"]} valueFormatter={count} allowDecimals={false} />);
    expect(yTicks().every(isWhole)).toBe(true);
    cleanup();
    inLocale(<LineChart title="New customers" data={SIGNUPS} index="month" categories={["count"]} valueFormatter={count} allowDecimals={false} />);
    expect(yTicks().every(isWhole)).toBe(true);
  });
});
