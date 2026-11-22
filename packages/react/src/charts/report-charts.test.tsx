import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ChartAnimation, SeasonalityHeatmap } from "./index";
import { WaterfallChart } from "./report-charts";
import { waterfallAxisWidth, waterfallRows } from "./report-charts";

// The waterfall and the seasonality heatmap, as charts on ChartParts.

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  // jsdom has no layout: the observer reports a 640×240 box, as a browser would for the chart's frame.
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function inLocale(ui: React.ReactElement, locale = "en", animate = false) {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={animate}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

const euro = (value: number) => `€ ${value.toLocaleString("en-US")}`;
const surface = () => document.querySelector<HTMLElement>(".recharts-surface[tabindex='0']")!;
const tooltip = () => document.querySelector("[data-slot='chart-tooltip']");
const bars = () => [...document.querySelectorAll("[data-slot='waterfall-bar']")];

/* ── WaterfallChart ───────────────────────────────────────────────────────── */

describe("WaterfallChart", () => {
  const STEPS = [
    { name: "Sales", value: 48000 },
    { name: "Shipping", value: -12500 },
    { name: "Other costs", value: -4100 },
  ];
  const chart = (props: Partial<React.ComponentProps<typeof WaterfallChart>> = {}) => (
    <WaterfallChart title="Revenue and costs" period="September 2026" steps={STEPS} endLabel="Net" valueFormatter={euro} {...props} />
  );

  it("runs the total through positive and negative steps, between the start and end totals", () => {
    expect(waterfallRows({ name: "Opening", value: 1000 }, [{ name: "A", value: 500 }, { name: "B", value: -2000 }, { name: "C", value: 300 }], "Closing")).toEqual([
      { key: "0", name: "Opening", kind: "start", from: 0, to: 1000 },
      { key: "1", name: "A", kind: "increase", change: 500, from: 1000, to: 1500 },
      // The running total goes below zero, and the next step starts there.
      { key: "2", name: "B", kind: "decrease", change: -2000, from: 1500, to: -500 },
      { key: "3", name: "C", kind: "increase", change: 300, from: -500, to: -200 },
      { key: "4", name: "Closing", kind: "end", from: 0, to: -200 },
    ]);
    // Without a start the total starts at zero; a step without a finite value is left out.
    expect(waterfallRows(undefined, [{ name: "A", value: 10 }, { name: "B", value: Number.NaN }], "End").map((row) => [row.name, row.from, row.to])).toEqual([
      ["A", 0, 10],
      ["End", 0, 10],
    ]);
  });

  it("draws a bar per step and total, each kind by lightness or pattern: totals solid, increases tinted, decreases hatched", () => {
    inLocale(chart({ start: { name: "Opening", value: 5000 } }));
    expect(bars().map((bar) => bar.getAttribute("data-kind"))).toEqual(["start", "increase", "decrease", "decrease", "end"]);
    const rect = (kind: string) => document.querySelector(`[data-slot='waterfall-bar'][data-kind='${kind}'] rect`)!;
    expect(rect("start").getAttribute("fill")).toBe("var(--ds-chart-1)");
    expect(rect("start").hasAttribute("stroke")).toBe(false);
    expect(rect("increase").getAttribute("fill")).toBe("color-mix(in oklab, var(--ds-chart-1) 25%, transparent)");
    expect(rect("increase").getAttribute("stroke")).toBe("var(--ds-chart-1)");
    const hatch = document.querySelector("[data-slot='waterfall-hatch']")!;
    expect(rect("decrease").getAttribute("fill")).toBe(`url(#${hatch.id})`);
    expect(rect("decrease").getAttribute("stroke")).toBe("var(--ds-chart-1)");
    // Only token colours, never hex.
    expect(document.querySelector("[data-slot='waterfall']")!.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b(?!-)/i);
  });

  it("labels each bar with its signed value through valueFormatter; the legend names the three kinds", () => {
    inLocale(chart());
    const labels = [...document.querySelectorAll("[data-slot='waterfall-label']")].map((text) => text.textContent);
    expect(labels).toEqual(["+€ 48,000", "−€ 12,500", "−€ 4,100", "€ 31,400"]);
    const legend = document.querySelector("[data-slot='chart-legend']")!;
    expect([...legend.querySelectorAll("[data-slot='chart-legend-item']")].map((item) => item.textContent)).toEqual(["Increase", "Decrease", "Total"]);
  });

  it("a label that would not fit its bar's band is left out (narrow charts), the value stays in the tooltip and table", () => {
    const many = Array.from({ length: 24 }, (_, index) => ({ name: `Cost ${index + 1}`, value: -1234567 }));
    inLocale(chart({ steps: many }));
    expect(bars()).toHaveLength(25);
    expect(document.querySelectorAll("[data-slot='waterfall-label']")).toHaveLength(0);
    expect(screen.getByRole("table").textContent).toContain("−€ 1,234,567");
  });

  it("a negative running total: the end total stands below zero, with a zero line and a signed label", () => {
    inLocale(chart({ steps: [{ name: "Sales", value: 3000 }, { name: "Shipping", value: -5000 }] }));
    expect(document.querySelector(".ds-waterfall-zero")).toBeTruthy();
    const labels = [...document.querySelectorAll("[data-slot='waterfall-label']")].map((text) => text.textContent);
    expect(labels.at(-1)).toBe("−€ 2,000");
    const ticks = [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].map((tick) => tick.textContent);
    expect(ticks.some((tick) => tick?.startsWith("−"))).toBe(true);
  });

  it("the data table is there by default, with the change and the running total, formatted and signed", () => {
    inLocale(chart());
    const table = screen.getByRole("table", { name: "Revenue and costs · September 2026" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Revenue and costs", "Change", "Total"]);
    expect(within(table).getAllByRole("row").slice(1).map((row) => row.textContent)).toEqual([
      "Sales+€ 48,000€ 48,000",
      "Shipping−€ 12,500€ 35,500",
      "Other costs−€ 4,100€ 31,400",
      "Net€ 31,400",
    ]);
    // The toggle shows the same data as an interactive Table.
    fireEvent.click(screen.getByRole("button", { name: "Show the data as a table" }));
    expect(document.querySelector("[data-slot='chart-data-table'] [data-slot='chart-data-table-plain']")).toBeNull();
    expect(screen.getByRole("grid", { name: "Revenue and costs · September 2026" })).toBeTruthy();
  });

  it("the tooltip follows the arrow keys over the bars, with the change and the running total", () => {
    inLocale(chart());
    // Focus lands on the first bar, as in every Recharts chart of the DS.
    act(() => surface().focus());
    expect(tooltip()!.textContent).toBe("SalesChange+€ 48,000Total€ 48,000");
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(tooltip()!.textContent).toBe("ShippingChange−€ 12,500Total€ 35,500");
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(tooltip()!.textContent).toBe("NetTotal€ 31,400");
  });

  it("names the plot for screen readers by the table's caption, inside a section named by the title", () => {
    inLocale(chart());
    expect(screen.getByRole("region", { name: "Revenue and costs" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Revenue and costs · September 2026" })).toBeTruthy();
  });

  it("loading and empty: a Skeleton, then the EmptyState when there are no steps or every figure is zero", () => {
    inLocale(chart({ isLoading: true }));
    expect(document.querySelector("[data-slot='chart-loading']")).toBeTruthy();
    cleanup();
    inLocale(chart({ steps: [] }));
    expect(document.querySelector("[data-slot='chart-empty']")!.textContent).toContain("No data for this period");
    cleanup();
    inLocale(chart({ steps: [{ name: "Sales", value: 0 }], emptyMessage: { title: "No revenue or costs this month" } }));
    expect(document.querySelector("[data-slot='chart-empty']")!.textContent).toContain("No revenue or costs this month");
  });

  it("draws the final frame at once with animation off, and under reduced motion with it on", () => {
    inLocale(chart());
    expect(bars()).toHaveLength(4);
    cleanup();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    inLocale(chart(), "en", true);
    expect(bars()).toHaveLength(4);
    expect(bars()[0]!.querySelector("rect")!.getAttribute("height")).not.toBe("0");
  });

  it("a zero step is neutral: neither an increase nor a decrease, no legend key, a flat line labelled without a sign", () => {
    expect(waterfallRows(undefined, [{ name: "A", value: -100 }, { name: "B", value: 0 }], "End").map((row) => row.kind)).toEqual(["decrease", "zero", "end"]);
    inLocale(chart({ steps: [{ name: "Shipping", value: -12500 }, { name: "Refunds", value: 0 }] }));
    const legend = document.querySelector("[data-slot='chart-legend']")!;
    expect([...legend.querySelectorAll("[data-slot='chart-legend-item']")].map((item) => item.textContent)).toEqual(["Decrease", "Total"]);
    const zero = document.querySelector("[data-slot='waterfall-bar'][data-kind='zero'] rect")!;
    expect(zero.getAttribute("height")).toBe("1.5");
    expect(zero.getAttribute("fill")).toBe("var(--ds-chart-1)");
    expect(zero.hasAttribute("stroke")).toBe(false);
    const labels = [...document.querySelectorAll("[data-slot='waterfall-label']")].map((text) => text.textContent);
    expect(labels).toEqual(["−€ 12,500", "€ 0", "−€ 12,500"]);
  });

  it("float residue and −0 are zero: no \"−€ 0\", and a residue step is neutral", () => {
    const rows = waterfallRows(undefined, [{ name: "A", value: 0.1 }, { name: "B", value: 0.2 }, { name: "C", value: -0.3 }], "End");
    expect(Object.is(rows.at(-1)!.to, 0)).toBe(true);
    expect(waterfallRows(undefined, [{ name: "A", value: -0 }], "End").map((row) => [row.kind, Object.is(row.change ?? row.to, 0)])).toEqual([
      ["zero", true],
      ["end", true],
    ]);
    // Residue relative to the figures: 1e6 + 0.1 − 0.1 leaves 1e6 exactly, and a change of 1e−12 next to 1e6 is zero.
    expect(waterfallRows({ name: "S", value: 1e6 }, [{ name: "A", value: 1e-12 }], "End")[1]!.kind).toBe("zero");
    inLocale(chart({ start: { name: "Opening", value: 0.3 }, steps: [{ name: "A", value: 0.1 }, { name: "B", value: 0.2 }, { name: "C", value: -0.6 }], valueFormatter: (value) => `€ ${value.toFixed(0)}` }));
    expect(screen.getByRole("table").textContent).not.toContain("−€ 0");
    expect(within(screen.getByRole("table")).getAllByRole("row").at(-1)!.textContent).toBe("Net€ 0");
  });

  it("a start without a finite value is left out with a warning; the end total is the finite steps' sum", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(waterfallRows({ name: "Opening", value: Number.NaN }, STEPS, "Net").map((row) => [row.kind, row.to])).toEqual([
      ["increase", 48000],
      ["decrease", 35500],
      ["decrease", 31400],
      ["end", 31400],
    ]);
    inLocale(chart({ start: { name: "Opening", value: Number.POSITIVE_INFINITY } }));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("start or steps without a finite value"));
    expect(within(screen.getByRole("table")).getAllByRole("row").at(-1)!.textContent).toBe("Net€ 31,400");
    expect(bars().map((bar) => bar.getAttribute("data-kind"))).toEqual(["increase", "decrease", "decrease", "end"]);
  });

  it("the value axis is as wide as its longest tick, 56px at least and 128px at most", () => {
    // Sized as the other charts size theirs: Recharts' own ticks, each at its estimated width
    // (axis-width's textWidth), plus the 8px it is drawn in from the plot. Over −6,700…48,200 they run from
    // "−€ 20,000" (60px; the typographic minus 9.25px, DejaVu Sans' widest) to "€ 60,000".
    expect(waterfallAxisWidth(-6700, 48200, euro)).toBe(68);
    // "€ 1,400,000", Recharts' top tick for 1,250,000: 68px.
    expect(waterfallAxisWidth(0, 1_250_000, euro)).toBe(76);
    // A minus counts: "−€ 1,400,000", 77px.
    expect(waterfallAxisWidth(-1_250_000, 0, euro)).toBe(85);
    // "−€ 14,000,000", 84px.
    expect(waterfallAxisWidth(-12_500_000, 0, euro)).toBe(92);
    expect(waterfallAxisWidth(-1e12, 0, euro)).toBe(128);
    const tickX = () => Number(document.querySelector(".recharts-yAxis-tick-labels text")!.getAttribute("x"));
    inLocale(chart());
    const narrow = tickX();
    // 0…48,000: "€ 60,000" (50px) and the inset are 58px.
    expect(narrow - 4 + 8).toBe(58);
    cleanup();
    inLocale(chart({ steps: [{ name: "Sales", value: 1_250_000 }, { name: "Shipping", value: -300_000 }] }));
    // "€ 1,400,000": the axis grew from 58 to 76px, and its ticks end at its plot-side edge.
    expect(tickX() - narrow).toBe(76 - 58);
  });

  it("measures its ticks for wrapping at the 11px they are drawn at, not at the page's body size", () => {
    // Recharts sizes a tick in a hidden span that takes only the tick's style; without the size there, the
    // span had the body's 14–16px and "−€ 1,350,000" broke over two lines in an axis it fits.
    inLocale(chart({ steps: [{ name: "Sales", value: 48_200 }, { name: "Costs", value: -1_250_000 }] }));
    const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-yAxis-tick-labels text, .recharts-xAxis-tick-labels text")];
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.style.fontSize).toBe("11px");
      expect(tick.getAttribute("font-size")).toBe("11");
    }
  });

  it("in RTL the steps run from the right and the value axis sits on the right", () => {
    inLocale(chart(), "ar-EG");
    const ticks = [...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map((tick) => ({ text: tick.textContent, x: Number(tick.getAttribute("x")) }));
    const at = (text: string) => ticks.find((tick) => tick.text === text)!.x;
    expect(at("Sales")).toBeGreaterThan(at("Net"));
    const yTick = Number(document.querySelector(".recharts-yAxis-tick-labels text")!.getAttribute("x"));
    expect(yTick).toBeGreaterThan(at("Sales"));
  });
});

/* ── SeasonalityHeatmap ───────────────────────────────────────────────────── */

describe("SeasonalityHeatmap", () => {
  const ROWS = ["Week 1", "Week 2"];
  const COLUMNS = ["Mon", "Tue", "Wed"];
  // Week 1 starts on Tuesday (no Monday cell); Wednesday of week 2 has no data yet.
  const DATA = [
    { row: "Week 1", column: "Tue", value: 0 },
    { row: "Week 1", column: "Wed", value: 4 },
    { row: "Week 2", column: "Mon", value: 9 },
    { row: "Week 2", column: "Tue", value: 2 },
    { row: "Week 2", column: "Wed", value: null },
  ];
  const heatmap = (props: Partial<React.ComponentProps<typeof SeasonalityHeatmap>> = {}) => (
    <SeasonalityHeatmap title="Order volume" period="September 2026" rows={ROWS} columns={COLUMNS} data={DATA} rowHeader="Week" valueFormatter={(value) => `${value} orders`} {...props} />
  );
  const cells = () => [...document.querySelectorAll<HTMLElement>("[data-slot='seasonality-heatmap-cell']")];
  const cell = (name: string) => screen.getByRole("gridcell", { name });

  it("a grid of rows by columns with column and row headers; a pair with no entry draws no cell", () => {
    inLocale(heatmap());
    const grid = screen.getByRole("grid", { name: "Order volume" });
    // The corner heads the row headers' column, named by rowHeader.
    expect(within(grid).getAllByRole("columnheader").map((header) => header.getAttribute("aria-label") ?? header.textContent)).toEqual(["Week", ...COLUMNS]);
    expect(within(grid).getAllByRole("rowheader").map((header) => header.textContent)).toEqual(ROWS);
    expect(cells()).toHaveLength(5);
    expect(document.querySelectorAll("[data-slot='seasonality-heatmap-gap']")).toHaveLength(1);
  });

  it("every row has as many cells as the header row, so each cell sits under its own weekday", () => {
    // A month of the lab's shape: week 1 starts on Tuesday, the last week ends on Wednesday, Sundays included.
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
    const month = Array.from({ length: 30 }, (_, index) => ({ row: weeks[Math.floor((index + 1) / 7)]!, column: weekdays[(index + 1) % 7]!, value: index % 4 }));
    inLocale(heatmap({ rows: weeks, columns: weekdays, data: month }));
    const grid = screen.getByRole("grid");
    // What assistive technology counts: the row's children with a role, none hidden.
    const exposed = (row: Element) => [...row.children].filter((child) => child.hasAttribute("role") && !child.closest("[aria-hidden='true']"));
    const [header, ...body] = within(grid).getAllByRole("row");
    const headers = exposed(header!).map((element) => element.getAttribute("aria-label") ?? element.textContent);
    expect(headers).toEqual(["Week", ...weekdays]);
    expect(body).toHaveLength(weeks.length);
    for (const row of body) {
      const rowCells = exposed(row);
      expect(rowCells).toHaveLength(headers.length);
      expect(rowCells[0]!.getAttribute("role")).toBe("rowheader");
      rowCells.forEach((element, position) => {
        if (element.getAttribute("data-slot") !== "seasonality-heatmap-cell") return;
        // "Week 2, Sun: 1" sits under "Sun".
        expect(element.getAttribute("aria-label")!.split(", ")[1]!.split(":")[0]).toBe(headers[position]);
      });
    }
    // Gaps: empty, unnamed, never focusable.
    const gaps = [...document.querySelectorAll<HTMLElement>("[data-slot='seasonality-heatmap-gap']")];
    expect(gaps).toHaveLength(5);
    for (const gap of gaps) {
      expect(gap.getAttribute("role")).toBe("gridcell");
      expect(gap.hasAttribute("aria-hidden")).toBe(false);
      expect(gap.hasAttribute("aria-label")).toBe(false);
      expect(gap.textContent).toBe("");
      expect(gap.hasAttribute("tabindex")).toBe(false);
    }
  });

  it("an empty cell is distinct from zero: hatched and named \"No data\", while zero is the flat first step", () => {
    inLocale(heatmap());
    const zero = cell("Week 1, Tue: 0 orders");
    const missing = cell("Week 2, Wed: No data");
    expect(zero.getAttribute("data-state")).toBe("zero");
    expect(zero.getAttribute("data-level")).toBe("0");
    expect(zero.style.background).toBe("var(--ds-background-neutral)");
    expect(missing.getAttribute("data-state")).toBe("missing");
    expect(missing.hasAttribute("data-level")).toBe(false);
    expect(missing.style.background).toContain("repeating-linear-gradient");
    expect(missing.style.background).not.toBe(zero.style.background);
    // The scale names the hatch too.
    expect(document.querySelector("[data-slot='seasonality-heatmap-missing-key']")!.textContent).toBe("No data");
  });

  it("colours by a sequential scale of token steps that differ in lightness, with a Less … More legend scale", () => {
    inLocale(heatmap({ thresholds: [1, 3, 5, 8] }));
    expect(cell("Week 1, Wed: 4 orders").getAttribute("data-level")).toBe("2");
    expect(cell("Week 2, Mon: 9 orders").getAttribute("data-level")).toBe("4");
    expect(cell("Week 2, Mon: 9 orders").style.background).toBe("var(--ds-chart-1)");
    expect(cell("Week 2, Tue: 2 orders").getAttribute("data-level")).toBe("1");
    const scale = document.querySelector("[data-slot='seasonality-heatmap-scale']")!;
    expect(scale.textContent).toContain("Less");
    expect(scale.textContent).toContain("More");
    expect(scale.querySelectorAll("[data-level]")).toHaveLength(5);
    for (const element of [...cells(), ...scale.querySelectorAll<HTMLElement>("[data-level]")]) expect(element.getAttribute("style")).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it("valueFormatter and a cell's own label name it for screen readers and the tooltip", () => {
    inLocale(heatmap({ data: [{ row: "Week 1", column: "Mon", value: 3, label: "Mon 1 September: 3 orders, 1 cancelled" }] }));
    const named = cell("Mon 1 September: 3 orders, 1 cancelled");
    act(() => named.focus());
    expect(tooltip()!.textContent).toBe("Mon 1 September: 3 orders, 1 cancelledValue3 orders");
    expect(document.querySelector("[data-slot='seasonality-heatmap-tooltip']")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("one tab stop; the arrow keys move a cell, skipping gaps, and the tooltip follows focus", () => {
    inLocale(heatmap());
    expect(cells().filter((element) => element.tabIndex === 0)).toHaveLength(1);
    const first = cells().find((element) => element.tabIndex === 0)!;
    act(() => first.focus());
    expect(tooltip()!.textContent).toBe("Week 1 · TueValue0 orders");
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(cell("Week 1, Wed: 4 orders"));
    expect(tooltip()!.textContent).toBe("Week 1 · WedValue4 orders");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell("Week 2, Wed: No data"));
    expect(tooltip()!.textContent).toBe("Week 2 · WedValueNo data");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(cell("Week 2, Mon: 9 orders"));
    // Up from Monday of week 2: week 1 has no Monday, so focus stays.
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell("Week 2, Mon: 9 orders"));
    fireEvent.keyDown(document.activeElement!, { key: "Home", ctrlKey: true });
    expect(document.activeElement).toBe(cell("Week 1, Tue: 0 orders"));
    expect(cells().filter((element) => element.tabIndex === 0)).toEqual([document.activeElement]);
    // Escape hides the tooltip; leaving the grid hides it too.
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(tooltip()).toBeNull();
  });

  it("hovering never moves focus: Enter presses the focused cell, the tab stop stays, the arrows go on from it", () => {
    const onCellPress = vi.fn();
    inLocale(heatmap({ onCellPress }));
    const focusedCell = cell("Week 2, Mon: 9 orders");
    const hoveredCell = cell("Week 1, Wed: 4 orders");
    act(() => focusedCell.focus());
    fireEvent.mouseEnter(hoveredCell);
    // The tooltip shows the cell under the pointer while it hovers one…
    expect(tooltip()!.textContent).toBe("Week 1 · WedValue4 orders");
    // …but the keys act on the focused cell, and the tab stop stays on it.
    fireEvent.keyDown(focusedCell, { key: "Enter" });
    expect(onCellPress).toHaveBeenCalledTimes(1);
    expect(onCellPress).toHaveBeenLastCalledWith(DATA[2]);
    fireEvent.keyDown(focusedCell, { key: " " });
    expect(onCellPress).toHaveBeenLastCalledWith(DATA[2]);
    expect(cells().filter((element) => element.tabIndex === 0)).toEqual([focusedCell]);
    expect(hoveredCell.tabIndex).toBe(-1);
    // The arrows go on from the focused cell, and the tooltip comes back to it.
    fireEvent.keyDown(focusedCell, { key: "ArrowRight" });
    expect(document.activeElement).toBe(cell("Week 2, Tue: 2 orders"));
    expect(tooltip()!.textContent).toBe("Week 2 · TueValue2 orders");
    expect(cells().filter((element) => element.tabIndex === 0)).toEqual([document.activeElement]);
    // The pointer takes it again on the next cell it enters; leaving that cell gives it back to focus.
    fireEvent.mouseEnter(cell("Week 1, Tue: 0 orders"));
    expect(tooltip()!.textContent).toBe("Week 1 · TueValue0 orders");
    fireEvent.mouseLeave(cell("Week 1, Tue: 0 orders"));
    expect(tooltip()!.textContent).toBe("Week 2 · TueValue2 orders");
  });

  it("hover alone shows the tooltip and moves nothing; leaving the grid hides it", () => {
    inLocale(heatmap());
    const before = cells().find((element) => element.tabIndex === 0);
    fireEvent.mouseEnter(cell("Week 2, Mon: 9 orders"));
    expect(tooltip()!.textContent).toBe("Week 2 · MonValue9 orders");
    expect(cells().find((element) => element.tabIndex === 0)).toBe(before);
    fireEvent.mouseLeave(screen.getByRole("grid"));
    expect(tooltip()).toBeNull();
  });

  it("the tooltip is placed again when the sideways scroll container scrolls", () => {
    let shift = 0;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const isCell = this.getAttribute("data-slot") === "seasonality-heatmap-cell";
      const left = isCell ? 300 - shift : 0;
      const width = isCell ? 24 : 640;
      return { left, right: left + width, width, top: isCell ? 100 : 0, bottom: isCell ? 128 : 240, height: isCell ? 28 : 240, x: left, y: 0, toJSON() {} } as DOMRect;
    });
    inLocale(heatmap());
    act(() => cell("Week 2, Mon: 9 orders").focus());
    const tip = () => document.querySelector<HTMLElement>("[data-slot='seasonality-heatmap-tooltip']")!;
    expect(tip().style.left).toBe("312px");
    shift = 100;
    act(() => {
      document.querySelector("[data-slot='seasonality-heatmap-scroll']")!.dispatchEvent(new Event("scroll"));
    });
    expect(tip().style.left).toBe("212px");
  });

  it("Enter and a press report the cell", () => {
    const onCellPress = vi.fn();
    inLocale(heatmap({ onCellPress }));
    const target = cell("Week 2, Mon: 9 orders");
    act(() => target.focus());
    fireEvent.keyDown(target, { key: "Enter" });
    expect(onCellPress).toHaveBeenLastCalledWith(DATA[2]);
    fireEvent.click(cell("Week 1, Wed: 4 orders"));
    expect(onCellPress).toHaveBeenLastCalledWith(DATA[1]);
  });

  it("in RTL the arrows follow the reading direction", () => {
    inLocale(heatmap(), "ar-EG");
    const first = cells().find((element) => element.tabIndex === 0)!;
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(cells()[1]);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);
  });

  it("a negative value draws as step 0, like zero, and keeps its signed value in its name", () => {
    inLocale(heatmap({ data: [{ row: "Week 1", column: "Mon", value: -3 }, { row: "Week 1", column: "Tue", value: 5 }] }));
    const negative = cell("Week 1, Mon: -3 orders");
    expect(negative.getAttribute("data-level")).toBe("0");
    expect(negative.style.background).toBe("var(--ds-background-neutral)");
  });

  it("warns once when thresholds are not strictly ascending, and when row or column names repeat", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(heatmap({ thresholds: [1, 3, 5, 8] }));
    expect(warn).not.toHaveBeenCalled();
    cleanup();
    inLocale(heatmap({ thresholds: [5, 3, 8, 8] }));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("strictly ascending"));
    cleanup();
    warn.mockClear();
    inLocale(heatmap({ rows: ["Week 1", "Week 1"], columns: ["Mon", "Tue", "Tue"] }));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unique names"));
    // A repeated name's cells are drawn once, in its first place; the rest are gaps.
    expect(cells().map((element) => element.getAttribute("aria-label"))).toEqual(["Week 1, Tue: 0 orders"]);
    expect(document.querySelectorAll("[data-slot='seasonality-heatmap-gap']")).toHaveLength(5);
  });

  it("the data table is there by default: one row per row, every value formatted, no data said in words", () => {
    inLocale(heatmap());
    const table = screen.getByRole("table", { name: "Order volume · September 2026" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Week", ...COLUMNS]);
    expect(within(table).getAllByRole("row").slice(1).map((row) => row.textContent)).toEqual(["Week 10 orders4 orders", "Week 29 orders2 ordersNo data"]);
  });

  it("loading and empty: nothing measured (no cells, or only cells without data) is the empty state", () => {
    inLocale(heatmap({ isLoading: true }));
    expect(document.querySelector("[data-slot='chart-loading']")).toBeTruthy();
    cleanup();
    inLocale(heatmap({ data: [] }));
    expect(document.querySelector("[data-slot='chart-empty']")).toBeTruthy();
    cleanup();
    inLocale(heatmap({ data: [{ row: "Week 1", column: "Mon", value: null }] }));
    expect(document.querySelector("[data-slot='chart-empty']")).toBeTruthy();
    cleanup();
    // A measured zero is data, not empty.
    inLocale(heatmap({ data: [{ row: "Week 1", column: "Mon", value: 0 }] }));
    expect(document.querySelector("[data-slot='chart-empty']")).toBeNull();
  });

  it("transitions colour only when animation is on, and not under reduced motion", () => {
    inLocale(heatmap(), "en", true);
    expect(cells()[0]!.className).toContain("transition-[background-color]");
    cleanup();
    inLocale(heatmap());
    expect(cells()[0]!.className).not.toContain("transition");
    cleanup();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    inLocale(heatmap(), "en", true);
    expect(cells()[0]!.className).not.toContain("transition");
  });
});
