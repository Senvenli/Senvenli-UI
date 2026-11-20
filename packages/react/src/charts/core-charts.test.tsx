import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { barLabelRoom } from "./core-charts";
import { AreaChart, BarChart, ChartAnimation, ComposedChart, LineChart } from "./index";

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
afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

type Month = { month: string; revenue: number; lastYear: number; web: number; email: number; store: number; agency: number; partner: number; other: number };
const MONTHS: Month[] = [
  { month: "Jun", revenue: 31000, lastYear: 27000, web: 31, email: 18, store: 9, agency: 4, partner: 3, other: 1 },
  { month: "Jul", revenue: 42000, lastYear: 35000, web: 42, email: 22, store: 11, agency: 5, partner: 2, other: 2 },
  { month: "Aug", revenue: 48000, lastYear: 41000, web: 48, email: 25, store: 14, agency: 6, partner: 4, other: 1 },
];
const euro = (value: number) => `€ ${value.toLocaleString("tr-TR")}`;
const surface = () => document.querySelector<HTMLElement>(".recharts-surface[tabindex='0']")!;
// Recharts 3 draws tick and reference labels in their own layers, not inside the axis group.
const yTicks = () => [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].map((tick) => tick.textContent);
const svgText = () => [...document.querySelectorAll(".recharts-surface text")].map((text) => text.textContent);
const strokes = (selector: string) => [...document.querySelectorAll(selector)].map((path) => path.getAttribute("stroke"));

describe("AreaChart", () => {
  const area = (props: Partial<React.ComponentProps<typeof AreaChart<Month>>> = {}) => (
    <AreaChart title="Revenue" period="June–August 2026" total="€ 121.000" data={MONTHS} index="month" categories={["revenue"]} comparison="lastYear" labels={{ revenue: "2026", lastYear: "2025" }} valueFormatter={euro} {...props} />
  );

  it("heads the chart with title, period and the total in metric-medium, as a named section", () => {
    inLocale(area());
    const section = screen.getByRole("region", { name: "Revenue" });
    const header = section.querySelector("[data-slot='chart-header']")!;
    expect(header.textContent).toContain("June–August 2026");
    expect(header.querySelector("[data-slot='chart-total']")!.getAttribute("class")).toContain("text-metric-medium");
  });

  it("draws ds-chart-1 at 16% over the comparison dashed in ds-chart-neutral without fill", () => {
    inLocale(area());
    const fill = document.querySelector(".recharts-area-area")!;
    expect(fill.getAttribute("fill")).toBe("var(--ds-chart-1)");
    expect(fill.getAttribute("fill-opacity")).toBe("0.16");
    const comparison = document.querySelector(".recharts-line-curve")!;
    expect(comparison.getAttribute("stroke")).toBe("var(--ds-chart-neutral)");
    expect(comparison.getAttribute("stroke-dasharray")).toBe("6 4");
  });

  it("generates the data table from data, index and categories, formatted", () => {
    inLocale(area());
    const table = screen.getByRole("table", { name: "Revenue · June–August 2026" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Period", "2026", "2025"]);
    expect(within(table).getAllByRole("row")[1]!.textContent).toBe(`Jun${euro(31000)}${euro(27000)}`);
  });

  it("the value axis starts at zero", () => {
    inLocale(area());
    expect(yTicks()[0]).toBe(euro(0));
  });

  it("the tooltip follows the arrow keys over data points", () => {
    inLocale(area());
    act(() => surface().focus());
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(document.querySelector("[data-slot='chart-tooltip']")?.textContent).toMatch(/^Jun2026€ 31\.0002025€ 27\.000$|^Jul/);
  });

  it("reports the row under a press, not null", () => {
    const onValueChange = vi.fn();
    inLocale(area({ onValueChange }));
    act(() => surface().focus());
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    fireEvent.click(document.querySelector(".recharts-wrapper")!);
    expect(onValueChange).toHaveBeenCalled();
    expect(MONTHS).toContain(onValueChange.mock.calls.at(-1)![0]);
  });

  it("the comparison's legend key is dashed like its line; an empty chart says so by default", () => {
    inLocale(area());
    const keys = [...document.querySelectorAll("[data-slot='chart-legend-key'][data-kind='line'] line")];
    expect(keys.map((line) => line.getAttribute("stroke-dasharray"))).toEqual(["6 4"]);
    cleanup();
    inLocale(area({ data: [] }));
    expect(document.querySelector("[data-slot='chart-empty']")!.textContent).toContain("No data for this period");
  });

  it("shows loading and empty in the frame", () => {
    inLocale(area({ isLoading: true }));
    expect(document.querySelector("[data-slot='chart-loading']")).toBeTruthy();
    cleanup();
    inLocale(area({ data: [], emptyMessage: { title: "No data for this period" } }));
    expect(document.querySelector("[data-slot='chart-empty']")!.textContent).toContain("No data for this period");
  });

  it("in RTL time runs from the right and the value axis sits on the right", () => {
    inLocale(area(), "ar-EG");
    const ticks = [...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map((tick) => ({
      text: tick.textContent,
      x: Number(tick.getAttribute("x")),
    }));
    const june = ticks.find((tick) => tick.text === "Jun")!;
    const august = ticks.find((tick) => tick.text === "Aug")!;
    expect(june.x).toBeGreaterThan(august.x);
    // A right-hand value axis anchors its labels at their start.
    expect(document.querySelector(".recharts-yAxis-tick-labels text")!.getAttribute("text-anchor")).toBe("start");
  });
});

describe("LineChart", () => {
  const line = (props: Partial<React.ComponentProps<typeof LineChart<Month>>> = {}) => (
    <LineChart title="Channels" data={MONTHS} index="month" categories={["web", "email", "store"]} labels={{ web: "Website", email: "Email", store: "Store" }} {...props} />
  );

  it("2px lines in series colours, dashed after the second; the legend sits below with line keys", () => {
    inLocale(line());
    expect(strokes(".recharts-line-curve")).toEqual(["var(--ds-chart-1)", "var(--ds-chart-2)", "var(--ds-chart-3)"]);
    expect([...document.querySelectorAll(".recharts-line-curve")].map((path) => path.getAttribute("stroke-dasharray"))).toEqual([null, null, "6 4"]);
    const frame = document.querySelector("[data-slot='chart-frame']")!;
    const children = [...frame.children].map((child) => child.getAttribute("data-slot"));
    expect(children.indexOf("chart-legend")).toBeGreaterThan(children.indexOf("chart-plot"));
    expect(frame.querySelectorAll("[data-slot='chart-legend-key'][data-kind='line']")).toHaveLength(3);
  });

  it("the legend hides and shows a line", () => {
    inLocale(line());
    fireEvent.click(screen.getByRole("button", { name: "Store" }));
    expect(document.querySelectorAll(".recharts-line-curve")).toHaveLength(2);
  });

  it("draws a reference line with its label", () => {
    inLocale(line({ referenceLines: [{ value: 30, label: "Target" }] }));
    expect(document.querySelector(".recharts-reference-line-line")!.getAttribute("stroke")).toBe("var(--ds-border-bold)");
    expect(svgText()).toContain("Target");
  });

  it("warns once past five lines", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(line({ categories: ["web", "email", "store", "agency", "partner", "other"] }));
    expect(warn.mock.calls.filter(([message]) => String(message).startsWith("LineChart:"))).toHaveLength(1);
    warn.mockRestore();
  });
});

describe("BarChart", () => {
  type Region = { region: string; orders: number; lastYear: number; weekend: number };
  const REGIONS: Region[] = [
    { region: "North", orders: 42, lastYear: 35, weekend: 12 },
    { region: "South", orders: 61, lastYear: 50, weekend: 20 },
    { region: "East", orders: 18, lastYear: 22, weekend: 5 },
  ];

  it("grouped: the current series ds-chart-1, the comparison neutral, 2px radius", () => {
    inLocale(<BarChart title="Orders" data={REGIONS} index="region" categories={["orders"]} comparison="lastYear" />);
    const fills = [...document.querySelectorAll(".recharts-bar")].map((bar) => bar.querySelector("path")?.getAttribute("fill"));
    expect(fills).toEqual(["var(--ds-chart-1)", "var(--ds-chart-neutral)"]);
  });

  it("horizontal: ranked by value, labels at the start, totals at the bar end", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders"]} layout="horizontal" valueFormatter={(value) => `${value} orders`} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["South", "North", "East"]);
    expect([...document.querySelectorAll(".recharts-label-list text")].map((label) => label.textContent)).toEqual(["61 orders", "42 orders", "18 orders"]);
  });

  it("totals and ranking count only what is shown", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders", "weekend"]} labels={{ weekend: "Weekend" }} layout="horizontal" type="stacked" />);
    expect([...document.querySelectorAll(".recharts-label-list text")].map((label) => label.textContent)).toEqual(["81", "54", "23"]);
    fireEvent.click(screen.getByRole("button", { name: "Weekend" }));
    expect([...document.querySelectorAll(".recharts-label-list text")].map((label) => label.textContent)).toEqual(["61", "42", "18"]);
  });

  it("a comparison sits beside a stack, never on it, and ranking ignores it", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders"]} comparison="lastYear" layout="horizontal" type="stacked" />);
    // Ranked by this year (South 61, North 42, East 18), though East's last year (22) beats its 18.
    expect(within(screen.getByRole("table")).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["South", "North", "East"]);
    // Each series carries its own label: no stacked sum of this year and last.
    const labels = [...document.querySelectorAll(".recharts-label-list text")].map((label) => label.textContent);
    expect(labels).toEqual(expect.arrayContaining(["61", "50"]));
    expect(labels).not.toContain("111");
  });

  it("in RTL the totals sit at the bar end inside the chart", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders"]} layout="horizontal" />, "ar-EG");
    for (const label of document.querySelectorAll(".recharts-label-list text")) expect(Number(label.getAttribute("x"))).toBeGreaterThanOrEqual(0);
  });

  it("keeps a natural order when asked, and stacks share one stack with the total on the last part", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders", "weekend"]} layout="horizontal" type="stacked" sortBy="none" />);
    expect(within(screen.getByRole("table")).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["North", "South", "East"]);
    expect([...document.querySelectorAll(".recharts-label-list text")].map((label) => label.textContent)).toEqual(["54", "81", "23"]);
  });

  it("percent stacks show shares on the value axis", () => {
    inLocale(<BarChart title="Share" data={REGIONS} index="region" categories={["orders", "weekend"]} type="percent" />, "tr-TR");
    // Locale format: Turkish puts the sign first.
    expect(yTicks()[0]).toBe("%0");
    expect(yTicks().at(-1)).toBe("%100");
  });

  it("an average line", () => {
    inLocale(<BarChart title="Orders" data={REGIONS} index="region" categories={["orders"]} referenceLines={[{ value: 40, label: "Average" }]} />);
    expect(svgText()).toContain("Average");
  });
});

describe("ComposedChart", () => {
  type Week = { week: string; orders: number; price: number };
  const WEEKS: Week[] = [
    { week: "W1", orders: 120, price: 54 },
    { week: "W2", orders: 140, price: 49 },
  ];

  it("volume as ds-chart-2 bars on the left axis, the rate as a ds-chart-1 line on the right; the table formats per axis", () => {
    inLocale(
      <ComposedChart
        title="Demand and price"
        data={WEEKS}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "right" }]}
        labels={{ orders: "Orders", price: "Daily price" }}
        valueFormatters={{ left: (value) => `${value} orders`, right: (value) => `€ ${value}` }}
      />,
    );
    expect(document.querySelector(".recharts-bar path")!.getAttribute("fill")).toBe("var(--ds-chart-2)");
    expect(document.querySelector(".recharts-line-curve")!.getAttribute("stroke")).toBe("var(--ds-chart-1)");
    expect(document.querySelectorAll(".recharts-yAxis")).toHaveLength(2);
    expect(within(screen.getByRole("table")).getAllByRole("columnheader")[0]!.textContent).toBe("Period");
    const row = within(screen.getByRole("table")).getAllByRole("row")[1]!;
    expect(row.textContent).toBe("W1€ 54120 orders");
  });
});

describe("ComposedChart series and axes", () => {
  type Week = { week: string; orders: number; price: number; target: number };
  const WEEKS: Week[] = [
    { week: "W1", orders: 120, price: 54, target: 50 },
    { week: "W2", orders: 140, price: 49, target: 50 },
  ];

  it("two lines differ by hue and pattern; no right axis when nothing uses it", () => {
    inLocale(
      <ComposedChart
        title="Demand"
        data={WEEKS}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "left" }, { key: "target", axis: "left" }]}
        valueFormatters={{ left: String, right: String }}
      />,
    );
    const lines = [...document.querySelectorAll(".recharts-line-curve")];
    expect(lines.map((line) => line.getAttribute("stroke"))).toEqual(["var(--ds-chart-1)", "var(--ds-chart-3)"]);
    expect(lines.map((line) => line.getAttribute("stroke-dasharray"))).toEqual([null, "6 4"]);
    expect(document.querySelector(".recharts-bar path")!.getAttribute("fill")).toBe("var(--ds-chart-2)");
    expect(document.querySelectorAll(".recharts-yAxis")).toHaveLength(1);
  });
});

describe("comparison, ranking and axes at the edges", () => {
  type Region = { region: string; orders: number; weekend: number; lastYear: number };
  const REGIONS: Region[] = [
    { region: "North", orders: 42, weekend: 30, lastYear: 35 },
    { region: "South", orders: 50, weekend: 4, lastYear: 50 },
  ];

  it("a percent chart leaves the comparison out, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<BarChart title="Share" data={REGIONS} index="region" categories={["orders", "weekend"]} comparison="lastYear" type="percent" />);
    expect(document.querySelectorAll(".recharts-bar")).toHaveLength(2);
    expect(warn.mock.calls.some(([message]) => String(message).startsWith("BarChart: a comparison is left out"))).toBe(true);
    warn.mockRestore();
  });

  it("horizontal ranking stays put while the legend hides a series", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders", "weekend"]} labels={{ weekend: "Weekend" }} layout="horizontal" type="stacked" />);
    const order = () => within(screen.getByRole("table")).getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(order()).toEqual(["North", "South"]);
    fireEvent.click(screen.getByRole("button", { name: "Weekend" }));
    // South (50) would outrank North (42) on the visible part alone; the order holds.
    expect(order()).toEqual(["North", "South"]);
  });

  it("a ComposedChart with every series on the right draws no left axis", () => {
    type Week = { week: string; price: number; orders: number };
    inLocale(
      <ComposedChart
        title="Price"
        data={[{ week: "W1", price: 54, orders: 120 }]}
        index="week"
        bars={[{ key: "orders", axis: "right" }]}
        lines={[{ key: "price", axis: "right" }]}
        valueFormatters={{ left: String, right: String }}
      />,
    );
    expect(document.querySelectorAll(".recharts-yAxis")).toHaveLength(1);
  });
});

describe("ticks and labels measured at the 11px they are drawn at", () => {
  // Recharts decides whether a tick or label wraps by sizing it in a hidden span that takes only its style; with
  // the size only in the font-size attribute, the span had the page's body size (14–16px) and "€ 1.500.000"
  // broke over two lines in an axis it fits at 11px. The size is in style too, with its unit.
  const ticks = () => [...document.querySelectorAll<SVGTextElement>(".recharts-cartesian-axis-tick-value")];
  const labels = () => [...document.querySelectorAll<SVGTextElement>(".recharts-label")];
  const expectEleven = (texts: SVGTextElement[]) => {
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text.style.fontSize).toBe("11px");
      expect(text.getAttribute("font-size")).toBe("11");
    }
  };
  type Region = { region: string; orders: number; weekend: number };
  const REGIONS: Region[] = [
    { region: "North", orders: 1_450_000, weekend: 300_000 },
    { region: "South", orders: 900_000, weekend: 200_000 },
  ];
  const average = [{ value: 1_000_000, label: "Avg." }];

  it("AreaChart: every tick of both axes", () => {
    inLocale(<AreaChart title="Revenue" data={MONTHS} index="month" categories={["revenue"]} comparison="lastYear" valueFormatter={euro} yAxisWidth={80} />);
    expect(document.querySelectorAll(".recharts-xAxis-tick-labels text").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".recharts-yAxis-tick-labels text").length).toBeGreaterThan(0);
    expectEleven(ticks());
  });

  it("LineChart: every tick, and the reference line's label", () => {
    inLocale(<LineChart title="Revenue" data={MONTHS} index="month" categories={["revenue"]} valueFormatter={euro} referenceLines={[{ value: 40000, label: "Target" }]} />);
    expectEleven(ticks());
    expectEleven(labels());
  });

  it("BarChart in columns: every tick, and the reference line's label", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders", "weekend"]} type="stacked" valueFormatter={euro} referenceLines={average} />);
    expectEleven(ticks());
    expectEleven(labels());
  });

  it("BarChart in horizontal bars: the value ticks, the category names and the totals at the bar ends", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders"]} layout="horizontal" valueFormatter={euro} referenceLines={average} />);
    expect(document.querySelectorAll(".recharts-yAxis-tick-labels text").length).toBe(REGIONS.length);
    expectEleven(ticks());
    // The totals ("€ 1.450.000") and the reference line's label.
    expect(labels().map((label) => label.textContent)).toEqual(expect.arrayContaining([euro(1_450_000), euro(900_000), "Avg."]));
    expectEleven(labels());
  });

  it("ComposedChart: every tick of the time axis and both value axes", () => {
    type Week = { week: string; price: number; orders: number };
    inLocale(
      <ComposedChart<Week>
        title="Price"
        data={[{ week: "W1", price: 54, orders: 120 }, { week: "W2", price: 61, orders: 140 }]}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "right" }]}
        valueFormatters={{ left: String, right: euro }}
      />,
    );
    expect(document.querySelectorAll(".recharts-yAxis")).toHaveLength(2);
    expectEleven(ticks());
  });
});

describe("a horizontal bar's end room fits its widest total", () => {
  // At a fixed 48px, "€ 1.450.000" (61px at 11px, plus its 5px gap) broke over two lines at a 390px phone in LTR
  // and was cut at the chart's edge in RTL. The room is now the widest total's estimated width (axis-width's
  // textWidth: "€ 1.450.000" is 69px) plus the gap.
  type Region = { region: string; orders: number; weekend: number; lastYear: number };
  const REGIONS: Region[] = [
    { region: "North", orders: 1_450_000, weekend: 300_000, lastYear: 900_000 },
    { region: "South", orders: 900_000, weekend: 200_000, lastYear: 700_000 },
  ];
  // The plot's box: Recharts clips the bars to it. The frame is 640px wide (the ResizeObserver above).
  const plot = () => {
    const rect = document.querySelector(".recharts-surface defs clipPath rect")!;
    return { x: Number(rect.getAttribute("x")), width: Number(rect.getAttribute("width")) };
  };
  const endRoom = (dir: "ltr" | "rtl" = "ltr") => (dir === "ltr" ? 640 - plot().x - plot().width : plot().x);
  const startRoom = (dir: "ltr" | "rtl" = "ltr") => (dir === "ltr" ? plot().x : 640 - plot().x - plot().width);
  const horizontal = (props: Partial<React.ComponentProps<typeof BarChart<Region>>> = {}, locale?: string) =>
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders"]} layout="horizontal" valueFormatter={euro} {...props} />, locale);

  it("the widest total's estimated width plus the label's 5px gap, between 48 and 96px", () => {
    expect(barLabelRoom([])).toBe(0);
    // Short totals keep the 48px every total had.
    expect(barLabelRoom(["61"])).toBe(48);
    expect(barLabelRoom(["€ 48.920"])).toBe(56);
    expect(barLabelRoom(["€ 1.450.000"])).toBe(74);
    // The widest decides, and a minus counts.
    expect(barLabelRoom(["€ 900.000", "−€ 12.450.000", "€ 1.450.000"])).toBe(90);
    // Never over 96px, however long.
    expect(barLabelRoom(["€ 1.450.000.000.007"])).toBe(96);
  });

  it("short totals keep 48px; long ones get room for the widest", () => {
    horizontal({ data: [{ region: "North", orders: 42, weekend: 0, lastYear: 0 }], valueFormatter: undefined });
    expect(endRoom()).toBe(48);
    cleanup();
    horizontal();
    // "€ 1.450.000": 69px.
    expect(endRoom()).toBe(74);
    // The category names keep their 112px column after the 4px edge.
    expect(startRoom()).toBe(116);
  });

  it("sizes the room by the valueFormatter's text, not the raw number", () => {
    const data = [{ region: "North", orders: 61, weekend: 0, lastYear: 0 }];
    horizontal({ data, valueFormatter: (value) => `${value} orders` });
    expect(endRoom()).toBe(59);
    cleanup();
    horizontal({ data, valueFormatter: String });
    expect(endRoom()).toBe(48);
  });

  it("a very long total is held at 96px", () => {
    horizontal({ data: [{ region: "North", orders: 1_450_000_000_007, weekend: 0, lastYear: 0 }] });
    expect(endRoom()).toBe(96);
  });

  it("a stack counts its total, of the parts shown; a comparison its own value", () => {
    const data = [{ region: "North", orders: 600_000, weekend: 500_000, lastYear: 0 }];
    horizontal({ data, categories: ["orders", "weekend"], labels: { weekend: "Weekend" }, type: "stacked" });
    // "€ 1.100.000" on the stack, though no part is longer than "€ 600.000".
    expect(endRoom()).toBe(74);
    fireEvent.click(screen.getByRole("button", { name: "Weekend" }));
    // Only "€ 600.000" shows now.
    expect(endRoom()).toBe(64);
    cleanup();
    horizontal({ data: [{ region: "North", orders: 600, weekend: 500, lastYear: 12_000_000 }], categories: ["orders", "weekend"], comparison: "lastYear", type: "stacked" });
    // "€ 12.000.000" beside a "€ 1.100" stack.
    expect(endRoom()).toBe(82);
  });

  it("a negative total sits at the start side and takes no end room, nor does a stack's negative total on a forward last part", () => {
    horizontal({ data: [{ region: "North", orders: 42, weekend: 0, lastYear: 0 }, { region: "South", orders: -1_250_000, weekend: 0, lastYear: 0 }] });
    expect(endRoom()).toBe(48);
    cleanup();
    horizontal({ data: [{ region: "North", orders: -1_000_000, weekend: 50_000, lastYear: 0 }], categories: ["orders", "weekend"], type: "stacked" });
    // "€ -950.000" stands past the forward "weekend" part, but that part ends at -950,000: inside the plot, short of
    // the end room, which keeps its 48px.
    expect(endRoom()).toBe(48);
  });

  it("percent bars draw no totals and keep 48px", () => {
    horizontal({ categories: ["orders", "weekend"], type: "percent" });
    expect(document.querySelectorAll(".recharts-label-list text")).toHaveLength(0);
    expect(endRoom()).toBe(48);
  });

  it("in RTL the room is on the left, the bar end", () => {
    horizontal({}, "ar-EG");
    // Formatted by the chart's own valueFormatter ("€ 1.450.000"), whatever the locale.
    expect(endRoom("rtl")).toBe(74);
    expect(startRoom("rtl")).toBe(116);
  });

  it("columns keep their 4px edge", () => {
    inLocale(<BarChart title="Regions" data={REGIONS} index="region" categories={["orders"]} valueFormatter={euro} />);
    expect(endRoom()).toBe(4);
  });
});

describe("value axes as wide as their longest tick", () => {
  // Recharts keeps a tick on one line only while it is narrower than the axis, and draws it 8px in from the plot
  // (its tick size and margin). "€ 20.000" is 48px at 11px in Geist: in the fixed 48px axis it wrapped. An axis is
  // now its longest tick's estimated width (axis-width's textWidth) plus those 8px, 48–128px; the
  // tick's x (at the plot side, LTR) is the axis's 4px margin plus its width less the 8px.
  const axisWidth = (selector = ".recharts-yAxis-tick-labels") => Number(document.querySelector(`${selector} text`)!.getAttribute("x")) - 4 + 8;
  type Big = { month: string; revenue: number; lastYear: number };
  const BIG: Big[] = [
    { month: "Jun", revenue: 900_000, lastYear: 400_000 },
    { month: "Jul", revenue: 1_450_000, lastYear: 700_000 },
  ];

  it("AreaChart without yAxisWidth: from its ticks, the comparison's among them", () => {
    inLocale(<AreaChart title="Revenue" data={BIG} index="month" categories={["revenue"]} comparison="lastYear" valueFormatter={euro} />);
    expect(yTicks()).toEqual(["€ 0", "€ 500.000", "€ 1.000.000", "€ 1.500.000"]);
    // "€ 1.500.000": 68px in tabular figures.
    expect(axisWidth()).toBe(68 + 8);
  });

  it("an app's yAxisWidth still wins, wider or narrower", () => {
    inLocale(<AreaChart title="Revenue" data={BIG} index="month" categories={["revenue"]} valueFormatter={euro} yAxisWidth={60} />);
    expect(axisWidth()).toBe(60);
    cleanup();
    inLocale(<AreaChart title="Revenue" data={MONTHS} index="month" categories={["revenue"]} valueFormatter={euro} yAxisWidth={120} />);
    expect(axisWidth()).toBe(120);
  });

  it("a series hidden from the legend leaves the axis, as it leaves Recharts' ticks", () => {
    inLocale(<LineChart title="Revenue" data={[{ month: "Jun", own: 54, store: 1_450_000 }]} index="month" categories={["own", "store"]} labels={{ own: "Own", store: "Store" }} valueFormatter={euro} />);
    expect(axisWidth()).toBe(76);
    fireEvent.click(screen.getByRole("button", { name: "Store" }));
    expect(yTicks()).toEqual(["€ 0", "€ 20", "€ 40", "€ 60"]);
    expect(axisWidth()).toBe(48);
  });

  it("short figures keep the 48px axis", () => {
    inLocale(<LineChart title="Orders" data={MONTHS} index="month" categories={["web", "email"]} />);
    expect(yTicks()).toEqual(["0", "20", "40", "60"]);
    expect(axisWidth()).toBe(48);
  });

  it("LineChart: \"€ 60.000\" gets 58px, and a negative tick counts with its sign", () => {
    inLocale(<LineChart title="Revenue" data={MONTHS} index="month" categories={["revenue", "lastYear"]} valueFormatter={euro} />);
    expect(yTicks()).toEqual(["€ 0", "€ 20.000", "€ 40.000", "€ 60.000"]);
    // "€ 60.000": 50px.
    expect(axisWidth()).toBe(58);
    cleanup();
    inLocale(<LineChart title="Net" data={[{ month: "Jun", net: -1_200_000 }, { month: "Jul", net: 800_000 }]} index="month" categories={["net"]} valueFormatter={euro} />);
    expect(yTicks()).toEqual(["€ -1.600.000", "€ -800.000", "€ 0", "€ 800.000"]);
    // "€ -1.600.000": 73px, its minus 5px.
    expect(axisWidth()).toBe(73 + 8);
  });

  it("BarChart in columns: \"€ 1.500.000\" gets 76px, not the 48px it wrapped in; a stack counts its total", () => {
    inLocale(<BarChart title="Regions" data={BIG} index="month" categories={["revenue"]} valueFormatter={euro} />);
    expect(yTicks().at(-1)).toBe("€ 1.500.000");
    expect(axisWidth()).toBe(76);
    cleanup();
    // 1,450,000 + 700,000 stacked: ticks to "€ 2.250.000".
    inLocale(<BarChart title="Regions" data={BIG} index="month" categories={["revenue", "lastYear"]} type="stacked" valueFormatter={euro} />);
    expect(yTicks().at(-1)).toBe("€ 2.250.000");
    expect(axisWidth()).toBe(76);
  });

  it("BarChart in percent: 0–100% keeps 48px", () => {
    inLocale(<BarChart title="Channel" data={MONTHS} index="month" categories={["web", "email"]} type="percent" />);
    expect(axisWidth()).toBe(48);
  });

  it("ComposedChart: each value axis from the series on it, in its own format", () => {
    type Week = { week: string; price: number; orders: number };
    inLocale(
      <ComposedChart<Week>
        title="Price"
        data={[{ week: "W1", price: 1_250_000, orders: 120 }, { week: "W2", price: 1_420_000, orders: 140 }]}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "right" }]}
        valueFormatters={{ left: String, right: euro }}
      />,
    );
    const [left, right] = [...document.querySelectorAll(".recharts-yAxis-tick-labels")];
    expect([...left!.querySelectorAll("text")].map((text) => text.textContent)).toEqual(["0", "50", "100", "150"]);
    expect(Number(left!.querySelector("text")!.getAttribute("x"))).toBe(4 + 48 - 8);
    // The right axis draws its ticks 8px past its inner edge: its width is where the plot ends to the svg's edge.
    expect([...right!.querySelectorAll("text")].map((text) => text.textContent)).toEqual(["€ 0", "€ 500.000", "€ 1.000.000", "€ 1.500.000"]);
    expect(640 - 4 - (Number(right!.querySelector("text")!.getAttribute("x")) - 8)).toBe(76);
  });
});
