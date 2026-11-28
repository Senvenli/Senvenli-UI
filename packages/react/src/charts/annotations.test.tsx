import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { AreaChart, BarChart, ChartAnimation, ChartTooltip, LineChart } from "./index";

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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const inLocale = (ui: React.ReactElement) =>
  render(
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
const VISITS = [
  { day: "Mon", visits: 120 },
  { day: "Tue", visits: 180 },
  { day: "Wed", visits: 240 },
  { day: "Thu", visits: 210 },
];
const NOTES = [
  { at: "Tue", label: "Release 2.0" },
  { at: "Tue", label: "Newsletter" },
  { at: "Thu", label: "Campaign start" },
];
const marks = () => document.querySelectorAll("[data-slot='chart-annotation-mark']");

describe("chart annotations", () => {
  it("one mark per annotated period on Area, Line and vertical Bar charts", () => {
    for (const ui of [
      <AreaChart key="a" title="Visits" data={VISITS} index="day" categories={["visits"]} annotations={NOTES} />,
      <LineChart key="l" title="Visits" data={VISITS} index="day" categories={["visits"]} annotations={NOTES} />,
      <BarChart key="b" title="Visits" data={VISITS} index="day" categories={["visits"]} annotations={NOTES} />,
    ]) {
      inLocale(ui);
      expect(marks()).toHaveLength(2);
      cleanup();
    }
  });

  it("the data table lists every note on its period", () => {
    inLocale(<LineChart title="Visits" data={VISITS} index="day" categories={["visits"]} annotations={NOTES} defaultTableOpen />);
    expect(screen.getByRole("columnheader", { name: "Notes" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Tue" }).closest("[role='row']")!.textContent).toContain("Release 2.0; Newsletter");
    expect(screen.getByRole("rowheader", { name: "Mon" }).closest("[role='row']")!.textContent).not.toContain("Release");
  });

  it("the tooltip of a period lists its notes", () => {
    render(<ChartTooltip active label="Tue" payload={[{ dataKey: "visits", name: "visits", value: 180, color: "red" }]} notes={(at) => NOTES.filter((note) => note.at === at).map((note) => note.label)} />);
    expect([...document.querySelectorAll("[data-slot='chart-tooltip-note']")].map((note) => note.textContent)).toEqual(["Release 2.0", "Newsletter"]);
  });

  it("warns for a note that matches no row, and leaves notes out of horizontal bars", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<LineChart title="Visits" data={VISITS} index="day" categories={["visits"]} annotations={[{ at: "Sun", label: "Off" }]} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Sun"));
    cleanup();
    inLocale(<BarChart title="Visits" data={VISITS} index="day" categories={["visits"]} layout="horizontal" annotations={NOTES} />);
    expect(marks()).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("horizontal"));
  });

  it("without annotations nothing changes: no marks, no Notes column", () => {
    inLocale(<LineChart title="Visits" data={VISITS} index="day" categories={["visits"]} defaultTableOpen />);
    expect(marks()).toHaveLength(0);
    expect(screen.queryByRole("columnheader", { name: "Notes" })).toBeNull();
  });
});
