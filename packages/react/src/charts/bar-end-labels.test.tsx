import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { labelText, textWidth } from "./axis-width";
import { PlottedTooltip, barLabelLines, barLabelRoom, barLabelWidth } from "./core-charts";
import { AreaChart, BarChart, ChartAnimation, ComposedChart, LineChart, RadarChart } from "./index";

/**
 * Horizontal BarChart totals at the bar end: the DS label that wraps in both directions (H1), the
 * value axis' start padding for negative totals, guarded by the measured width (H2), and the added scope of the
 * card (the null last part, totals drawn in the end room, bidi marks, numeric strings, Recharts' stacking, the
 * clamp, the percent axis).
 */

// jsdom has no layout. The chart's frame is `frameWidth` wide: the ResizeObserver reports it (as a browser does
// once the frame is laid out), unless `observing` is off, which stands for the first render before any report.
let frameWidth = 640;
let observing = true;
const observers = new Set<{ callback: ResizeObserverCallback; target: Element }>();
function report(width: number) {
  frameWidth = width;
  act(() => {
    for (const { callback, target } of observers) {
      callback([{ target, contentRect: { width, height: 240, top: 0, left: 0, right: width, bottom: 240, x: 0, y: 0 } } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    }
  });
}
beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      observers.add({ callback: this.callback, target });
      if (observing) this.callback([{ target, contentRect: { width: frameWidth, height: 240, top: 0, left: 0, right: frameWidth, bottom: 240, x: 0, y: 0 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {
      observers.clear();
    }
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => frameWidth });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 240 });
});
beforeEach(() => {
  frameWidth = 640;
  observing = true;
});
afterEach(() => {
  cleanup();
  observers.clear();
  vi.restoreAllMocks();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

const euro = (value: number) => `€ ${value.toLocaleString("en-US")}`;
type Region = { region: string; a: number | string | null; b?: number | string | null; c?: number | string | null };
const plot = () => {
  const rect = document.querySelector(".recharts-surface defs clipPath rect")!;
  return { x: Number(rect.getAttribute("x")), width: Number(rect.getAttribute("width")) };
};
const svgWidth = () => Number(document.querySelector(".recharts-surface")!.getAttribute("width"));
type Drawn = { text: string; lines: string[]; x: number; anchor: string; left: number; right: number };
/** Each bar-end total as drawn, with its extent by the same estimate the chart sizes it by. */
const totals = (): Drawn[] =>
  [...document.querySelectorAll<SVGTextElement>(".recharts-label-list text")].map((text) => {
    const lines = [...text.querySelectorAll("tspan")].map((span) => span.textContent ?? "");
    const x = Number(text.getAttribute("x"));
    const anchor = text.getAttribute("text-anchor") ?? "start";
    const width = Math.max(...lines.map(barLabelWidth));
    return { text: text.textContent ?? "", lines, x, anchor, left: anchor === "end" ? x - width : x, right: anchor === "end" ? x : x + width };
  });
const valueTicks = () => [...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map((tick) => ({ text: tick.textContent, x: Number(tick.getAttribute("x")) }));
const horizontal = (data: Region[], props: Partial<React.ComponentProps<typeof BarChart<Region>>> = {}, locale?: string) =>
  inLocale(<BarChart title="Regions" data={data} index="region" categories={["a"]} layout="horizontal" valueFormatter={euro} sortBy="none" {...props} />, locale);

describe("H1: a bar-end total wraps between its words within the room on its own side, in both directions", () => {
  it("lines by the same estimate as the room: whole when it fits, between its words otherwise, a long figure on its own", () => {
    expect(barLabelLines("€ 1,450,000", 91)).toEqual(["€ 1,450,000"]);
    // A phrase parts between its own words; the figure keeps the word written against it.
    expect(barLabelLines("€ 1,000,000 in yearly revenue", 91)).toEqual(["€ 1,000,000 in", "yearly revenue"]);
    // "net" is written against the figure: one unit, 98px, wider than the 91px room, so one line (no wrap that
    // would still overflow), which ends at the room's edge.
    expect(barLabelLines("€ 12,450,000 net", 91)).toEqual(["€ 12,450,000 net"]);
    // A figure with its currency is one unit: wider than the room, it keeps one line (and ends at the room's edge).
    expect(barLabelLines("€ 1,450,000,000,007", 91)).toEqual(["€ 1,450,000,000,007"]);
    // A no-break space never parts: Intl keeps a figure together with it (ru, fr group digits with U+00A0, U+202F);
    // "gross", written against the figure, stays with it too, so in 70–80px the label is one line.
    expect(barLabelLines("48.920,00\u00a0€ gross", 80)).toEqual(["48.920,00\u00a0€ gross"]);
    expect(barLabelLines("48.920,00\u00a0€ gross profit", textWidth("48.920,00\u00a0€ gross"))).toEqual(["48.920,00\u00a0€ gross", "profit"]);
    const ru = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "EUR" }).format(1_450_000);
    expect(barLabelLines(ru, 10)).toEqual([ru]);
    expect(barLabelLines("€ 1,450,000", 0)).toEqual(["€ 1,450,000"]);
  });

  it("B1: a run of words without a letter (currency, sign, figure, %) never parts", () => {
    // "€ -350,000" must never be drawn as "€" over "-350,000".
    expect(barLabelLines("€ -350,000", 30)).toEqual(["€ -350,000"]);
    expect(barLabelLines("€ -1,200,000", 0)).toEqual(["€ -1,200,000"]);
    expect(barLabelLines("% 12", 10)).toEqual(["% 12"]);
    expect(barLabelLines("- € 1,450,000", 20)).toEqual(["- € 1,450,000"]);
    // It breaks only between two words with letters: a word written against a figure ("net",
    // "total", "target") stays with it, and a unit wider than the room keeps the label on one line.
    expect(barLabelLines("€ 12,000,000 net", 80)).toEqual(["€ 12,000,000 net"]);
    expect(barLabelLines("€ 12,000,000 net", 20)).toEqual(["€ 12,000,000 net"]);
    expect(barLabelLines("total € 1,450,000", 70)).toEqual(["total € 1,450,000"]);
    expect(barLabelLines("€ 900,000 / € 1,450,000 target", 100)).toEqual(["€ 900,000 / € 1,450,000 target"]);
    // Words with letters part as before, and the spaces between joined words are kept as they were.
    expect(barLabelLines("124 orders  this month", 80)).toEqual(["124 orders", "this month"]);
  });

  it("B1 in the chart: no total is drawn with its currency on a line of its own, at any width, in both directions", () => {
    const data = [
      { region: "North", a: 1_450_000 },
      { region: "South", a: -350_000 },
      { region: "East", a: 600_000_000_000 },
      { region: "West", a: -1_200_000 },
    ];
    for (const width of [320, 640]) {
      for (const locale of ["en", "ar-EG"]) {
        frameWidth = width;
        horizontal(data, {}, locale);
        const labels = totals();
        expect(labels).toHaveLength(4);
        for (const label of labels) {
          expect(label.lines).toEqual([label.text]);
          for (const line of label.lines) expect(line).toMatch(/\d/);
        }
        cleanup();
      }
    }
    // Four charts: room for a loaded machine.
  }, 20_000);

  const LONG = [
    // At a nice tick (the axis ends at 1,000,000), so the bar runs to the end room.
    { region: "North", a: 1_000_000 },
    { region: "South", a: 90_000 },
  ];
  // A phrase after the figure: it parts between its own words, never from the figure.
  const income = (value: number) => `${euro(value)} in yearly revenue`;

  it("LTR: past the 96px end room it wraps toward the chart's edge, never past it", () => {
    horizontal(LONG, { valueFormatter: income });
    const [first, second] = totals();
    expect(first!.lines).toEqual(["€ 1,000,000 in", "yearly revenue"]);
    expect(first!.anchor).toBe("start");
    expect(first!.right).toBeLessThanOrEqual(svgWidth());
    // A total with room on its line is drawn whole, as before.
    expect(second!.lines).toEqual(["€ 90,000 in yearly revenue"]);
  });

  it("RTL: the same lines toward the left edge, which Recharts sized by the room on the right (one line, cut)", () => {
    horizontal(LONG, { valueFormatter: income }, "ar-EG");
    const [first] = totals();
    expect(first!.lines).toEqual(["€ 1,000,000 in", "yearly revenue"]);
    expect(first!.anchor).toBe("end");
    expect(first!.left).toBeGreaterThanOrEqual(0);
  });

  it("a figure and the word written against it wider than the room: one line ending 2px short of the chart's edge", () => {
    const net = (value: number) => `${euro(value)} net`;
    horizontal([{ region: "North", a: 12_000_000 }, { region: "South", a: 900_000 }], { valueFormatter: net });
    expect(totals()[0]!.lines).toEqual(["€ 12,000,000 net"]);
    expect(totals()[0]!.anchor).toBe("end");
    expect(totals()[0]!.right).toBe(svgWidth() - 2);
    cleanup();
    horizontal([{ region: "North", a: 12_000_000 }, { region: "South", a: 900_000 }], { valueFormatter: net }, "ar-EG");
    expect(totals()[0]!.lines).toEqual(["€ 12,000,000 net"]);
    expect(totals()[0]!.left).toBe(2);
  });

  it("a figure wider than its room ends 2px short of the chart's edge (N1), over its bar's tip, in both directions", () => {
    const data = [{ region: "North", a: 1_450_000_000_007 }];
    horizontal(data);
    expect(totals()[0]!.lines).toEqual(["€ 1,450,000,000,007"]);
    expect(totals()[0]!.anchor).toBe("end");
    expect(totals()[0]!.right).toBe(svgWidth() - 2);
    cleanup();
    horizontal(data, {}, "ar-EG");
    expect(totals()[0]!.anchor).toBe("start");
    expect(totals()[0]!.left).toBe(2);
  });

  it("N1: a negative total too wide for the room before the plot starts 2px inside the plot, never on its edge", () => {
    frameWidth = 320;
    const data = [{ region: "North", a: 1_450_000 }, { region: "South", a: -1_450_000_000_007 }];
    horizontal(data);
    const negative = totals().find((label) => label.text.includes("-"))!;
    expect(negative.lines).toEqual([negative.text]);
    expect(negative.anchor).toBe("start");
    expect(negative.x).toBe(plot().x + 2);
    cleanup();
    horizontal(data, {}, "ar-EG");
    const rtl = totals().find((label) => label.text.includes("-"))!;
    expect(rtl.anchor).toBe("end");
    expect(rtl.x).toBe(plot().x + plot().width - 2);
  });

  it("a total that fits is drawn as Recharts drew it: 5px past the bar's end, centred on it, at 11px", () => {
    horizontal([{ region: "North", a: 42 }], { valueFormatter: undefined });
    const text = document.querySelector<SVGTextElement>(".recharts-label-list text")!;
    expect(text.getAttribute("class")).toBe("recharts-text recharts-label");
    expect(text.getAttribute("font-size")).toBe("11");
    expect(text.style.fontSize).toBe("11px");
    expect(text.getAttribute("fill")).toBe("var(--ds-text-subtle)");
    expect(text.querySelector("tspan")!.getAttribute("dy")).toBe("0.355em");
    const bar = document.querySelector(".recharts-bar-rectangle path")!;
    expect(Number(text.getAttribute("x"))).toBeCloseTo(Number(bar.getAttribute("x")) + Number(bar.getAttribute("width")) + 5, 3);
    expect(Number(text.getAttribute("y"))).toBeCloseTo(Number(bar.getAttribute("y")) + Number(bar.getAttribute("height")) / 2, 3);
  });
});

describe("H2: a negative total stands clear of the category names", () => {
  const MIXED = [
    { region: "Northern Airport", a: 1_450_000 },
    { region: "South Central", a: -350_000 },
    { region: "Eastern Airport", a: 600_000 },
    { region: "West", a: -1_200_000 },
  ];

  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar-EG"]] as const) {
    it(`${dir}: the value axis starts later by the room the widest negative total needs, which never reaches the names`, () => {
      horizontal(MIXED, {}, locale);
      const box = plot();
      for (const label of totals().filter((total) => total.text.includes("-"))) {
        expect(label.lines).toEqual([label.text]);
        // The category names are outside the plot, on its start side.
        if (dir === "ltr") expect(label.left).toBeGreaterThanOrEqual(box.x);
        else expect(label.right).toBeLessThanOrEqual(box.x + box.width);
      }
    });
  }

  it("the padding waits for the measured width: the first render (and the server's) has none, so they agree", () => {
    observing = false;
    // Recharts sizes the chart from the frame's box before any observer report.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 640, height: 240, top: 0, left: 0, right: 640, bottom: 240, x: 0, y: 0, toJSON: () => ({}) });
    horizontal(MIXED);
    const before = valueTicks();
    expect(before[0]!.x).toBe(plot().x);
    report(640);
    // Measured: the axis' first tick (its start, -1,600,000) moves in from the plot's edge.
    expect(valueTicks()[0]!.x).toBeGreaterThan(plot().x);
    const html = () =>
      renderToString(
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <BarChart title="Regions" data={MIXED} index="region" categories={["a"]} layout="horizontal" valueFormatter={euro} />
        </DesignSystemProvider>,
      );
    expect(html()).toBe(html());
  });

  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar-EG"]] as const) {
    it(`${dir} at 320px with mixed signs: never more than half the plot, the bars still drawn either side of zero, labels kept off the names`, () => {
      frameWidth = 320;
      horizontal(MIXED, {}, locale);
      const box = plot();
      const ticks = valueTicks();
      const zero = ticks.find((tick) => tick.text === "€ 0")!;
      const start = ticks[0]!;
      // The padding is the distance from the plot's start edge to the axis' first tick: at most half the plot.
      const padding = dir === "ltr" ? start.x - box.x : box.x + box.width - start.x;
      expect(padding).toBeGreaterThan(0);
      expect(padding).toBeLessThanOrEqual(box.width / 2);
      // The axis still runs the right way: negatives toward the start, zero inside the plot.
      expect(zero.x).toBeGreaterThan(box.x);
      expect(zero.x).toBeLessThan(box.x + box.width);
      const labels = totals();
      const positive = labels.filter((label) => !label.text.includes("-"));
      const negative = labels.filter((label) => label.text.includes("-"));
      expect(positive).toHaveLength(2);
      expect(negative).toHaveLength(2);
      for (const label of positive) expect(label.anchor).toBe(dir === "ltr" ? "start" : "end");
      for (const label of negative) {
        // Running back from zero: past the bar's end (anchored on its near side), or, where even its lines pass
        // the room, flush with the plot's start (anchored on its far side).
        if (dir === "ltr") expect(label.left).toBeGreaterThanOrEqual(box.x);
        else expect(label.right).toBeLessThanOrEqual(box.x + box.width);
      }
    });
  }

  it("the padding follows the width as the chart is resized, and stays within half the plot", () => {
    const padding = () => valueTicks()[0]!.x - plot().x;
    horizontal(MIXED);
    const wide = padding();
    // "€ -1,200,000" (74px estimated, and its 5px gap) ends at the axis' start: the axis starts that much in.
    expect(wide).toBe(textWidth("€ -1,200,000") + 5);
    expect(wide).toBe(79);
    expect(wide).toBeGreaterThan(0);
    report(400);
    expect(padding()).toBeGreaterThan(0);
    expect(padding()).toBeLessThanOrEqual(plot().width / 2);
    report(1280);
    expect(padding()).toBeLessThanOrEqual(wide);
  });

  it("positive bars only: no padding, the axis starts at the plot's edge", () => {
    horizontal([{ region: "North", a: 1_450_000 }, { region: "South", a: 900_000 }]);
    expect(valueTicks()[0]!.x).toBe(plot().x);
  });
});

describe("added scope", () => {
  it("1: a stack whose last part is empty shows its total on the part before; every stack with a part has one", () => {
    const data = [
      { region: "North", a: 600_000, b: 500_000 },
      { region: "South", a: 400_000, b: null },
      { region: "East", a: 300_000 },
      { region: "West", a: 200_000, b: 0 },
    ];
    // Top to bottom, whichever part carries each.
    const byRow = () =>
      [...document.querySelectorAll<SVGTextElement>(".recharts-label-list text")]
        .sort((one, other) => Number(one.getAttribute("y")) - Number(other.getAttribute("y")))
        .map((text) => text.textContent);
    horizontal(data, { categories: ["a", "b"], type: "stacked" });
    expect(byRow()).toEqual(["€ 1,100,000", "€ 400,000", "€ 300,000", "€ 200,000"]);
    // The legend hiding the last part passes the total on too.
    fireEvent.click(screen.getByRole("button", { name: "b" }));
    expect(byRow()).toEqual(["€ 600,000", "€ 400,000", "€ 300,000", "€ 200,000"]);
  });

  it("2: only totals drawn in the end room size it; a stack's negative total on a forward part does not", () => {
    const end = () => 640 - plot().x - plot().width;
    horizontal([{ region: "North", a: -1_000_000, b: 50_000 }, { region: "South", a: 30, b: 12 }], { categories: ["a", "b"], type: "stacked" });
    expect(totals().map((label) => label.text)).toEqual(["€ -950,000", "€ 42"]);
    expect(end()).toBe(48);
    cleanup();
    horizontal([{ region: "North", a: 1_000_000, b: 50_000 }], { categories: ["a", "b"], type: "stacked" });
    expect(end()).toBe(barLabelRoom(["€ 1,050,000"]));
  });

  it("3: ar-EG totals: the U+200F before the figure takes no room, so the figure is not held at the cap", () => {
    const egp = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EUR" });
    const text = egp.format(48_920);
    expect(text.startsWith("\u200f")).toBe(true);
    expect(barLabelWidth(text)).toBe(textWidth(text.slice(1)));
    expect(barLabelRoom([text])).toBe(textWidth(text.slice(1)) + 5);
    horizontal([{ region: "North", a: 48_920 }], { valueFormatter: (value) => egp.format(value) }, "ar-EG");
    expect(plot().x).toBe(barLabelRoom([text]));
    expect(plot().x).toBeLessThan(96);
  });

  it("4: numeric strings are bars Recharts draws: they carry totals, rank, and size the value axis", () => {
    horizontal([{ region: "North", a: "900000" }, { region: "South", a: "1450000" }], { sortBy: "value" });
    expect(totals().map((label) => label.text)).toEqual(["€ 1,450,000", "€ 900,000"]);
    cleanup();
    inLocale(<LineChart title="Revenue" data={[{ month: "Jun", net: "900000" }, { month: "Jul", net: "1450000" }]} index="month" categories={["net"]} valueFormatter={euro} />);
    const ticks = [...document.querySelectorAll(".recharts-yAxis-tick-labels text")];
    expect(ticks.map((tick) => tick.textContent)).toEqual(["€ 0", "€ 500,000", "€ 1,000,000", "€ 1,500,000"]);
    // "€ 1,500,000": 68px plus the 8px inset, not the 48px floor.
    expect(Number(ticks[0]!.getAttribute("x")) - 4 + 8).toBe(76);
  });

  it("5: a mixed-sign stack spans what Recharts stacks (in series order), so its axis is no wider than its ticks", () => {
    inLocale(<BarChart title="Net" data={[{ month: "Jun", a: 1_000_000, b: -1_500_000 }]} index="month" categories={["a", "b"]} type="stacked" valueFormatter={euro} />);
    const ticks = [...document.querySelectorAll(".recharts-yAxis-tick-labels text")];
    // Recharts stacks the parts in order, 0 → 1,000,000 → -500,000: its ticks run from -500,000. Summing the
    // negatives by sign predicted an axis from -2,000,000 and 80px for "€ -2,000,000".
    expect(ticks.map((tick) => tick.textContent)).toEqual(["€ -500,000", "€ 0", "€ 500,000", "€ 1,000,000"]);
    expect(Number(ticks[0]!.getAttribute("x")) - 4 + 8).toBe(76);
  });

  it("6: a sized value axis gives each tick its room (less the 8px inset); past the clamp its ticks are compact and it is sized for them", () => {
    inLocale(<LineChart title="Revenue" data={[{ month: "Jun", net: 145_000_000_000_000_000 }]} index="month" categories={["net"]} valueFormatter={euro} />);
    const tick = document.querySelector(".recharts-yAxis-tick-labels text")!;
    // "€ 150,000,000,000,000,000" has no room in 128px: the axis shows "€ 150,000T" (65px) and is 73px.
    expect([...document.querySelectorAll(".recharts-yAxis-tick-labels text")].at(-1)!.querySelector("tspan")!.textContent).toBe("€ 150,000T");
    expect(textWidth("€ 150,000T", "tabular")).toBe(65);
    expect(Number(tick.getAttribute("x")) - 4 + 8).toBe(73);
    expect(tick.getAttribute("width")).toBe("65");
  });

  it("8: the percent axis is sized from every percent a tick can print, in the locale's format", () => {
    for (const locale of ["en", "tr-TR", "ar-EG", "fr-FR"]) {
      inLocale(<BarChart title="Share" data={[{ month: "Jun", a: 3, b: 1 }]} index="month" categories={["a", "b"]} type="percent" />, locale);
      const ticks = [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].map((tick) => tick.textContent);
      expect(ticks.at(-1)).toBe(new Intl.NumberFormat(locale, { style: "percent" }).format(1));
      const width = Number(document.querySelector(".recharts-yAxis-tick-labels text")!.getAttribute("width")) + 8;
      expect(width).toBe(48);
      cleanup();
    }
  });
});

describe("what the chart plots is what the table and the tooltip show", () => {
  const strings = [{ region: "North", a: "1450000" }, { region: "South", a: "900000" }, { region: "East", a: null }];
  const cells = () => within(screen.getByRole("table")).getAllByRole("row").slice(1).map((row) => row.textContent);
  const surface = () => document.querySelector<HTMLElement>(".recharts-surface[tabindex='0']")!;
  const tooltip = () => document.querySelector("[data-slot='chart-tooltip']")?.textContent;

  it("3: a numeric string is a bar with a total, and the data table shows it formatted, not \"—\"; a gap stays \"—\"", () => {
    horizontal(strings);
    expect(totals().map((label) => label.text)).toEqual(["€ 1,450,000", "€ 900,000"]);
    expect(cells()).toEqual(["North€ 1,450,000", "South€ 900,000", "East—"]);
  });

  it("3: the time charts' table and tooltip, a numeric string formatted as the number it is drawn at", () => {
    const months = [{ month: "Jun", net: "900000" }, { month: "Jul", net: "1450000" }, { month: "Aug", net: "abc" }];
    inLocale(<AreaChart title="Revenue" data={months} index="month" categories={["net"]} valueFormatter={euro} />);
    expect(cells()).toEqual(["Jun€ 900,000", "Jul€ 1,450,000", "Aug—"]);
    act(() => surface().focus());
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(tooltip()).toMatch(/€ (900|1,450),000/);
    expect(tooltip()).not.toMatch(/\d{6}/);
  });

  it("3: ComposedChart formats each axis' numeric strings in the table and the tooltip", () => {
    const weeks = [{ week: "W1", orders: "120", price: "54" }, { week: "W2", orders: "140", price: null }];
    inLocale(
      <ComposedChart
        title="Demand and price"
        data={weeks}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "right" }]}
        valueFormatters={{ left: (value) => `${value} orders`, right: (value) => `€ ${value}` }}
      />,
    );
    expect(cells()).toEqual(["W1€ 54120 orders", "W2—140 orders"]);
    act(() => surface().focus());
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    // Whichever week the arrow lands on, its orders are formatted ("140" was shown raw).
    expect(tooltip()).toMatch(/(120|140) orders/);
  });

  it("3: RadarChart's table and tooltip, a numeric string formatted", () => {
    const scores = ["Price", "Range", "Location", "Speed", "Rating"].map((dimension, index) => ({ dimension, us: String(60 + index * 5) }));
    inLocale(<RadarChart title="Competition" data={scores} dimension="dimension" categories={["us"]} labels={{ us: "Us" }} max={100} valueFormatter={(value) => `${value} pts`} />);
    expect(cells()[0]).toBe("Price60 pts");
    act(() => surface().focus());
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(tooltip()).toMatch(/Us\d+ pts/);
  });

  it("3: the tooltip formats a value as the chart plots it; text that is not a number stays as it is", () => {
    render(
      <PlottedTooltip
        active
        label="Jun"
        valueFormatter={euro}
        payload={[
          { dataKey: "a", name: "a", value: "1450000" },
          { dataKey: "b", name: "b", value: 900_000 },
          { dataKey: "c", name: "c", value: "none" },
        ]}
      />,
    );
    expect([...document.querySelectorAll("[data-slot='chart-tooltip-row'] bdi")].map((cell) => cell.textContent)).toEqual(["€ 1,450,000", "€ 900,000", "none"]);
  });

  it("2: a total that fits by the estimate is drawn whole: the estimate is close to Geist's 11px, not 7px a character", () => {
    // "€ 1,450,000 net" is 15 characters: 105px at 7px each, past the 91px a total has at the 96px cap, so it
    // wrapped. Geist draws it 81px; estimated 91px (its fallback face counted), it stays on one line.
    expect(barLabelWidth("€ 1,450,000 net")).toBe(91);
    expect(barLabelLines("€ 1,450,000 net", 91)).toEqual(["€ 1,450,000 net"]);
    horizontal([{ region: "North", a: 1_450_000 }], { valueFormatter: (value) => `${euro(value)} net` });
    expect(totals()[0]!.lines).toEqual(["€ 1,450,000 net"]);
  });
});

describe("N-b: labels of several figures wrap between them, and no label reaches the names", () => {
  it("a separator ending a word (\",\", \"/\", the Arabic comma) is a break between figures, each kept with its words", () => {
    expect(barLabelLines("12 shipments, 3 returns", 100)).toEqual(["12 shipments,", "3 returns"]);
    expect(barLabelLines("€ 900,000 / € 1,450,000 target", 110)).toEqual(["€ 900,000 /", "€ 1,450,000 target"]);
    expect(barLabelLines("١٢ حجزًا، ٣ إلغاء", 50)).toEqual(["١٢ حجزًا،", "٣ إلغاء"]);
    // Whole where it fits; a decimal comma is inside a figure, never a break; a figure still keeps its words.
    expect(barLabelLines("12 shipments, 3 returns", 200)).toEqual(["12 shipments, 3 returns"]);
    expect(barLabelLines("€ 1,5 Mn net", 10)).toEqual(["€ 1,5 Mn net"]);
    expect(barLabelLines("48.920,00\u00a0€ gross", 10)).toEqual(["48.920,00\u00a0€ gross"]);
  });

  /** The clip a label is drawn through, if any: its rectangle. */
  const clipOf = () => {
    const text = document.querySelector<SVGTextElement>(".recharts-label-list text")!;
    const id = /url\(#(.+)\)/.exec(text.getAttribute("clip-path") ?? "")?.[1];
    const rect = id ? document.getElementById(id)?.querySelector("rect") : undefined;
    return rect ? { left: Number(rect.getAttribute("x")), right: Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) } : undefined;
  };

  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar-EG"]] as const) {
    it(`${dir} at 320px: a total wider than the chart leaves it shows its figures compact and exact, clear of the names`, () => {
      frameWidth = 320;
      // The chart's own locale's euro, as an app formats in it.
      const format = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);
      const full = format(1.5e29);
      horizontal([{ region: "North", a: 1.5e29 }, { region: "South", a: 9 }], { valueFormatter: format }, locale);
      const [label] = totals();
      const text = document.querySelector<SVGTextElement>(".recharts-label-list text")!;
      expect(label!.lines).toEqual([dir === "ltr" ? "€150,000,000,000,000,000T" : "\u200f١٥٠٬٠٠٠٬٠٠٠٬٠٠٠٬٠٠٠٬٠٠٠\u00a0ترليون\u00a0€"]);
      expect(text.getAttribute("data-shortened")).toBe("true");
      expect(text.getAttribute("aria-label")).toBe(full);
      expect(text.querySelector("title")!.textContent).toBe(full);
      expect(clipOf()).toBeUndefined();
      if (dir === "ltr") expect(label!.left).toBeGreaterThanOrEqual(plot().x);
      else expect(label!.right).toBeLessThanOrEqual(plot().x + plot().width);
    });

    it(`${dir} at 320px: what even compact passes the plot's start is clipped there, never drawn over the names`, () => {
      frameWidth = 320;
      const wide = (value: number) => `${euro(value)}${"x".repeat(40)}`;
      horizontal([{ region: "North", a: 1_450_000 }, { region: "South", a: 9 }], { valueFormatter: wide }, locale);
      const text = document.querySelector<SVGTextElement>(".recharts-label-list text")!;
      const clip = clipOf()!;
      expect(text.getAttribute("aria-label")).toBe(wide(1_450_000));
      if (dir === "ltr") {
        expect(clip.left).toBe(plot().x + 2);
        expect(clip.right).toBe(svgWidth() - 2);
      } else {
        expect(clip.left).toBe(2);
        expect(clip.right).toBe(plot().x + plot().width - 2);
      }
      // Drawn from the clip's start edge, so its reading start ("€ 1,450,000") stays in view, never only its tail;
      // the tspans with it.
      expect(text.getAttribute("text-anchor")).toBe("start");
      expect(Number(text.getAttribute("x"))).toBe(clip.left);
      for (const span of text.querySelectorAll("tspan")) expect(Number(span.getAttribute("x"))).toBe(clip.left);
    });
  }

  it("a figure past the largest magnitude that compact still does not fit is written in scientific notation, exact, its currency kept", () => {
    // A 320px phone less the page's 16px gutters.
    frameWidth = 288;
    const format = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "EUR" }).format(value);
    horizontal([{ region: "North", a: 1.5e29 }, { region: "South", a: 9 }], { valueFormatter: format }, "ru-RU");
    const text = document.querySelector<SVGTextElement>(".recharts-label-list text")!;
    expect([...text.querySelectorAll("tspan")].map((span) => span.textContent)).toEqual(["1,5E29\u00a0€"]);
    expect(text.hasAttribute("clip-path")).toBe(false);
    expect(text.getAttribute("aria-label")).toBe(format(1.5e29));
    // By fit: compact where that fits, scientific only where compact does not.
    expect(labelText(format(1.5e29), 220, 220, "ru-RU").lines).toEqual(["150\u00a0000\u00a0000\u00a0000\u00a0000\u00a0000\u00a0трлн\u00a0€"]);
    expect(labelText(format(1.5e29), 160, 160, "ru-RU").lines).toEqual(["1,5E29\u00a0€"]);
    // Within the magnitudes, where compact fits, nothing changes.
    expect(labelText(format(1.5e12), 80, 80, "ru-RU").lines).toEqual(["1,5\u00a0трлн\u00a0€"]);
  });

  it("a label that fits is drawn as before: no clip, no accessible name of its own", () => {
    horizontal([{ region: "North", a: 1_450_000 }]);
    const text = document.querySelector<SVGTextElement>(".recharts-label-list text")!;
    expect(text.hasAttribute("clip-path")).toBe(false);
    expect(text.hasAttribute("aria-label")).toBe(false);
    expect(text.querySelector("title")).toBeNull();
  });
});
