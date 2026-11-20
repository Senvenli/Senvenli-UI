import * as React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { AXIS_MAX, TICK_INSET, labelText, textLines, textUnits, textWidth, tickAxisWidth, tickOverhang, tickText, tickWrapWidth, valueAxisTicks } from "./axis-width";
import { PlottedTooltip, barLabelLines } from "./core-charts";
import { AreaChart, BarChart, ChartAnimation, ComposedChart, LineChart, ScatterChart, WaterfallChart } from "./index";
import { waterfallAxisWidth } from "./report-charts";
import { CategoryTick, ValueTick, edgeShift, firstLineDy } from "./value-tick";

/**
 * The DS's value ticks: one unit rule with the bar-end labels (a currency, a sign and a figure never
 * part), compact figures in the chart's locale when a unit does not fit its axis, the whole tick kept for
 * assistive technology, and the WaterfallChart's axis sized as the other charts size theirs.
 */

// jsdom has no layout: the frame is `frameWidth` wide.
let frameWidth = 640;
beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: { width: frameWidth, height: 240, top: 0, left: 0, right: frameWidth, bottom: 240, x: 0, y: 0 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => frameWidth });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 240 });
});
afterEach(() => {
  cleanup();
  frameWidth = 640;
  vi.restoreAllMocks();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

const euro = (value: number) => `€ ${value.toLocaleString("tr-TR")}`;
const intl = (locale: string, options: Intl.NumberFormatOptions) => {
  const format = new Intl.NumberFormat(locale, options);
  return (value: number) => format.format(value);
};
type Tick = { lines: string[]; full: string | null; shortened: boolean; slot: string | null };
/** Each tick as drawn: its lines, and the whole tick it carries when it is shortened. */
const ticksOf = (selector: string): Tick[] =>
  [...document.querySelectorAll<SVGTextElement>(`${selector} text`)].map((text) => ({
    lines: [...text.querySelectorAll("tspan")].map((span) => span.textContent ?? ""),
    full: text.getAttribute("aria-label"),
    shortened: text.hasAttribute("data-shortened"),
    slot: text.getAttribute("data-slot"),
  }));
const yTicks = () => ticksOf(".recharts-yAxis-tick-labels");
const xTicks = () => ticksOf(".recharts-xAxis-tick-labels");
const shown = (ticks: Tick[]) => ticks.map((tick) => tick.lines.join(" | "));
/** A tick's lines never part a unit: no line is a sign or a currency alone while another holds the figure. */
const splitsUnit = (tick: Tick) => tick.lines.length > 1 && tick.lines.some((line) => /\p{Nd}/u.test(line)) && tick.lines.some((line) => !/\p{Nd}/u.test(line) && !/\p{L}/u.test(line));

describe("one unit rule for bar-end labels and value ticks", () => {
  it("bar-end labels lay out through the shared helper, in proportional figures", () => {
    for (const [text, room] of [
      ["€ 12.450.000 net", 91],
      ["€ 1.450.000.000.007", 91],
      ["48.920,00\u00a0€ gross", 70],
      ["total € 1.450.000", 70],
      ["124 orders  this month", 70],
    ] as const) {
      expect(barLabelLines(text, room)).toEqual(textLines(text, room));
    }
    expect(textUnits("€ -350.000 net this month").map((unit) => unit.unit)).toEqual(["€ -350.000 net", "this", "month"]);
  });

  it("a tick that fits stays whole; one too long for a line breaks only between units", () => {
    expect(tickText("€ 20.000", 50, "tr-TR")).toEqual({ lines: ["€ 20.000"], shortened: false });
    // "124 orders this month" is 125px (proportional; more in tabular figures): in 80px it breaks between the phrase's
    // words, never between "124" and the word written against it.
    expect(tickText("124 orders this month", 80, "tr-TR")).toEqual({ lines: ["124 orders", "this month"], shortened: false });
    // In tabular figures, as ticks are drawn.
    expect(textLines("€ 1.500.000", 66, "tabular")).toEqual(["€ 1.500.000"]);
    expect(textWidth("€ 1.500.000", "tabular")).toBe(68);
  });

  it("a figure wider than its room is shown compact, never as \"€\" over the figure", () => {
    expect(tickText("€ 150.000.000.000.000", AXIS_MAX - TICK_INSET, "tr-TR")).toEqual({ lines: ["€ 150\u00a0Tn"], shortened: true });
    // Compact only where it is exact: "1,5 Tn" would name another value, and the exact
    // "1,450000000007 Tn" is no shorter, so the figure stays as written and the word after it is dropped. The
    // figure is wider than 70px, so no "…" fits after it: the tick clips it within its room (ValueTick).
    expect(tickText("€ 1.450.000.000.007 net", 70, "tr-TR")).toEqual({ lines: ["€ 1.450.000.000.007"], shortened: true });
  });

  it("an axis is compact throughout: a tick that fits is compact when another of its axis is not", () => {
    const axis = ["€ 0", "€ 3.000.000.000.000", "€ 6.000.000.000.000", "€ 9.000.000.000.000", "€ 12.000.000.000.000"];
    const room = AXIS_MAX - TICK_INSET;
    expect(textWidth("€ 9.000.000.000.000", "tabular")).toBeLessThanOrEqual(room);
    expect(tickText("€ 9.000.000.000.000", room, "tr-TR", axis)).toEqual({ lines: ["€ 9\u00a0Tn"], shortened: true });
    // Nothing to shorten under 1,000.
    expect(tickText("€ 0", room, "tr-TR", axis)).toEqual({ lines: ["€ 0"], shortened: false });
    // An axis whose ticks all fit stays as formatted.
    expect(tickText("€ 9.000.000.000.000", room, "tr-TR", axis.slice(0, 4))).toEqual({ lines: ["€ 9.000.000.000.000"], shortened: false });
  });

  it("compact in the locale, in the formatter's own digits, its currency, sign and marks kept", () => {
    const room = 80;
    const value = 150_000_000_000_000;
    const cases: [string, string, string][] = [
      ["en-US", intl("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })(value), "€150T"],
      ["ru-RU", intl("ru-RU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })(value), "150\u00a0трлн\u00a0€"],
      ["tr-TR", intl("tr-TR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })(-value), "-€150\u00a0Tn"],
      ["fr-FR", intl("fr-FR", { maximumFractionDigits: 0 })(value), "150\u00a0Bn"],
    ];
    for (const [locale, text, compact] of cases) expect(tickText(text, room, locale).lines, `${locale} ${text}`).toEqual([compact]);
    // The decimal mark read as the locale writes it: "1,450,000.25" is about one and a half million in en.
    expect(tickText("1,450,000.00", 50, "en-US").lines).toEqual(["1.45M"]);
    expect(tickText("1.450.000,00", 50, "tr-TR").lines).toEqual(["1,45\u00a0Mn"]);
    // A lone "," or "." with three digits after it reads either way ("1,500" is 1.5 from a de formatter): with
    // nothing on the axis to tell, it is kept as written, never read by the chart's locale.
    expect(tickText("1,500", 10, "en-US").lines).toEqual(["1,500"]);
    expect(tickText("1.500", 10, "tr-TR").lines).toEqual(["1.500"]);
    expect(tickText("1,500", 10, "en-US", ["1,000,000"]).lines).toEqual(["1.5K"]);
    expect(tickText("1.500", 10, "tr-TR", ["1.000.000"]).lines).toEqual(["1,5\u00a0B"]);
    // ar-EG writes Arabic-Indic digits: the compact figure is in them too, its word in Arabic, the bidi marks kept.
    const arEuro = intl("ar-EG", { style: "currency", currency: "EUR" })(value);
    expect(tickText(arEuro, AXIS_MAX - TICK_INSET, "ar-EG").lines).toEqual(["\u200f١٥٠\u00a0ترليون\u00a0€"]);
    // The Egyptian pound's "ج.م." fits the clamp's 120px compact too; Arabic letters count at their own widths.
    const egp = intl("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 })(value);
    expect(tickText(egp, AXIS_MAX - TICK_INSET, "ar-EG").lines).toEqual(["\u200f١٥٠\u00a0ترليون\u00a0ج.م.\u200f"]);
    // In a narrower room the pound's "ج.م." is still the figure's own: the tick
    // keeps it, and clips what does not fit within its room. A qualifier after it is what drops, its "…" keeping to
    // the Arabic word's end with a right-to-left mark, never beside the figure.
    expect(tickText(egp, 50, "ar-EG").lines).toEqual(["\u200f١٥٠\u00a0ترليون\u00a0ج.م.\u200f"]);
    const [lead, figure] = tickText("إجمالي إيرادات المبيعات € 150.000.000.000.000 صافي هذا الشهر", 80, "ar").lines;
    expect(lead).toMatch(/^إجمالي.*…\u200f$/u);
    // "€ 150 ترليون" does not fit 80px; in scientific notation it does.
    expect(figure).toMatch(/^€ 1\.5E14/u);
    // The digits follow the formatter, not the locale's default: Latin figures in an Arabic chart stay Latin.
    expect(tickText("€ 150,000,000,000,000", AXIS_MAX - TICK_INSET, "ar").lines[0]).toMatch(/^€ 150\u00a0/);
  });

  it("the last resort drops whole words and ends in \"…\" within the room", () => {
    const { lines, shortened } = tickText("€ 12.000.000.000 net this month", 60, "tr-TR");
    expect(shortened).toBe(true);
    expect(lines).toEqual(["€ 12\u00a0Mr…"]);
    expect(textWidth(lines[0]!, "tabular")).toBeLessThanOrEqual(60);
    // After a Latin word, no mark.
    expect(lines[0]!.endsWith("…\u200f")).toBe(false);
    // A word is never cut: one with no figure is kept whole, wider than the room, and not shortened.
    expect(tickText("Averyveryverylongunitnamehere", 40, "tr-TR")).toEqual({ lines: ["Averyveryverylongunitnamehere"], shortened: false });
  });

  it("the axis is sized for its ticks as shown: compact ones bring it in from the clamp", () => {
    const ticks = ["€ 0", "€ 50.000.000.000.000", "€ 100.000.000.000.000", "€ 150.000.000.000.000"];
    expect(tickAxisWidth(ticks, 48)).toBe(AXIS_MAX);
    expect(tickAxisWidth(ticks, 48, 0, "tr-TR")).toBe(textWidth("€ 150\u00a0Tn", "tabular") + TICK_INSET);
    // Ticks that fit (or wrap between units) at the clamp are not compact.
    expect(tickAxisWidth(["€ 1.000.000.000"], 48, 0, "tr-TR")).toBe(tickAxisWidth(["€ 1.000.000.000"], 48));
    expect(tickAxisWidth(["124 orders from this month's revenue"], 48, 0, "tr-TR")).toBe(AXIS_MAX);
  });

  it("a figure keeps the words written against it, in any locale (tr, en, de, ar)", () => {
    const units = (text: string) => textUnits(text).map((unit) => unit.unit);
    const value = -1_450_000;
    for (const text of [
      "1.450.000 TL",
      "TRY 1.450.000",
      "€ 1,2 Mn",
      intl("tr-TR", { style: "unit", unit: "kilometer" })(-12_000),
      intl("en-US", { style: "unit", unit: "kilometer" })(-12_000),
      intl("de-DE", { style: "unit", unit: "kilometer" })(-12_000),
      intl("tr-TR", { notation: "compact", compactDisplay: "long" })(-1_200_000),
      intl("ar", { notation: "compact", compactDisplay: "long" })(-1_200_000),
      intl("de-DE", { style: "currency", currency: "EUR", currencyDisplay: "name" })(value),
      intl("ar", { style: "currency", currency: "EUR", currencyDisplay: "name" })(value),
      intl("tr-TR", { style: "currency", currency: "TRY", currencyDisplay: "code" })(value),
    ]) {
      expect(units(text), text).toEqual([text]);
      // Never a line holding a figure without its word, nor a word without its figure: one line, flush.
      expect(barLabelLines(text, 20), text).toEqual([text]);
      expect(tickText(text, 20, "tr-TR").lines, text).toHaveLength(1);
    }
    // A figure with "TL" in 45px is one line ending at the room's edge, no orphan "TL".
    expect(barLabelLines("-1.450.000 TL", 45)).toEqual(["-1.450.000 TL"]);
    // A multi-word name parts only between its own words, the first staying with the figure.
    expect(units(intl("en-US", { style: "currency", currency: "TRY", currencyDisplay: "name" })(value))).toEqual(["-1,450,000.00 Turkish", "Lira"]);
    // A phrase still wraps, between its words.
    expect(barLabelLines("124 orders this month", 91)).toEqual(["124 orders this", "month"]);
  });

  it("first lines sit where Recharts' Text puts them", () => {
    expect(firstLineDy(1)).toBe("0.355em");
    expect(firstLineDy(2)).toBe("-0.145em");
    expect(firstLineDy(1, "start")).toBe("0.71em");
    expect(firstLineDy(3, "end")).toBe("-2em");
  });
});

describe("the DS tick on every value axis", () => {
  const months = [
    { month: "Jun", a: 31_000, b: 27_000 },
    { month: "Jul", a: 42_000, b: 35_000 },
  ];
  const regions = [
    { region: "North", a: 1_450_000 },
    { region: "South", a: 900_000 },
  ];

  // Every chart with numeric value ticks, and which axes of it are value axes. Category names (months, regions,
  // waterfall steps) keep Recharts' own tick. Sparkline's axes are hidden; RadarChart, DonutChart, Gauge and the
  // list charts draw no Cartesian ticks.
  const value = (ticks: Tick[]) => ticks.length > 0 && ticks.every((tick) => tick.slot === "chart-value-tick");
  const recharts = (ticks: Tick[]) => ticks.length > 0 && ticks.every((tick) => tick.slot === null);
  const charts: [string, React.ReactElement, "y" | "x" | "both"][] = [
    ["AreaChart", <AreaChart title="Revenue" data={months} index="month" categories={["a"]} comparison="b" valueFormatter={euro} />, "y"],
    ["LineChart", <LineChart title="Revenue" data={months} index="month" categories={["a", "b"]} valueFormatter={euro} />, "y"],
    ["BarChart in columns", <BarChart title="Revenue" data={months} index="month" categories={["a", "b"]} valueFormatter={euro} />, "y"],
    ["BarChart, percent", <BarChart title="Share" data={months} index="month" categories={["a", "b"]} type="percent" />, "y"],
    ["BarChart, horizontal", <BarChart title="Regions" data={regions} index="region" categories={["a"]} layout="horizontal" valueFormatter={euro} />, "x"],
    [
      "ComposedChart, both axes",
      <ComposedChart
        title="Price"
        data={[{ week: "W1", orders: 120, price: 54 }]}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "right" }]}
        valueFormatters={{ left: String, right: euro }}
      />,
      "y",
    ],
    ["ScatterChart", <ScatterChart title="Price" data={[{ product: "A", price: 54, revenue: 41_000 }]} name="product" x="price" y="revenue" xLabel="Price" yLabel="Revenue" valueFormatters={{ y: euro }} />, "both"],
    ["WaterfallChart", <WaterfallChart title="Net" steps={[{ name: "Revenue", value: 48_200 }, { name: "Costs", value: -6_700 }]} endLabel="Net" valueFormatter={euro} />, "y"],
  ];
  for (const [name, chart, axes] of charts) {
    it(`${name}: the value ticks are the DS's, category names Recharts' own`, () => {
      inLocale(chart);
      if (axes === "both") expect(value(yTicks()) && value(xTicks())).toBe(true);
      else if (axes === "y") expect(value(yTicks()) && recharts(xTicks())).toBe(true);
      else expect(value(xTicks()) && recharts(yTicks())).toBe(true);
      if (name.startsWith("ComposedChart")) expect(document.querySelectorAll(".recharts-yAxis-tick-labels")).toHaveLength(2);
      // One chart, but its first render on a loaded machine.
    }, 20_000);
  }

  it("a tick that fits is drawn as Recharts drew it: one tspan, centred on its tick, the axis's room as its width", () => {
    inLocale(<LineChart title="Revenue" data={months} index="month" categories={["a"]} valueFormatter={euro} />);
    const tick = document.querySelector(".recharts-yAxis-tick-labels text")!;
    expect(tick.getAttribute("class")).toBe("recharts-text recharts-cartesian-axis-tick-value");
    expect(tick.getAttribute("text-anchor")).toBe("end");
    expect(tick.getAttribute("font-size")).toBe("11");
    expect((tick as SVGTextElement).style.fontSize).toBe("11px");
    expect(tick.getAttribute("width")).toBe(String(textWidth("€ 45.000", "tabular")));
    const spans = tick.querySelectorAll("tspan");
    expect(spans).toHaveLength(1);
    expect(spans[0]!.getAttribute("dy")).toBe("0.355em");
    expect(spans[0]!.getAttribute("x")).toBe(tick.getAttribute("x"));
    expect(tick.querySelector("title")).toBeNull();
    expect(tick.hasAttribute("aria-label")).toBe(false);
  });

  it("past the clamp the axis is compact and sized for it; each shortened tick keeps the whole figure; the table and tooltip have the values whole", () => {
    const data = [{ month: "Jun", net: 145_000_000_000_000 }];
    inLocale(<LineChart title="Revenue" data={data} index="month" categories={["net"]} valueFormatter={euro} />, "tr-TR");
    const ticks = yTicks();
    expect(shown(ticks)).toEqual(["€ 0", "€ 50\u00a0Tn", "€ 100\u00a0Tn", "€ 150\u00a0Tn"]);
    expect(ticks.map((tick) => tick.full)).toEqual([null, "€ 50.000.000.000.000", "€ 100.000.000.000.000", "€ 150.000.000.000.000"]);
    const last = document.querySelectorAll(".recharts-yAxis-tick-labels text")[3]!;
    expect(last.querySelector("title")!.textContent).toBe("€ 150.000.000.000.000");
    // The axis is as wide as "€ 150 Tn" plus the inset, not the 128px clamp.
    const width = textWidth("€ 150\u00a0Tn", "tabular") + TICK_INSET;
    expect(Number(last.getAttribute("x")) - 4 + TICK_INSET).toBe(width);
    expect(last.getAttribute("width")).toBe(String(tickWrapWidth(width)));
    expect(within(screen.getByRole("table")).getByText("€ 145.000.000.000.000")).toBeTruthy();
    cleanup();
    render(<PlottedTooltip active label="Jun" valueFormatter={euro} payload={[{ dataKey: "net", name: "Revenue", value: 145_000_000_000_000, color: "red" }]} />);
    expect(screen.getByText("€ 145.000.000.000.000")).toBeTruthy();
  });

  it("horizontal bars: a value tick wider than the plot is compact, never parted from its currency", () => {
    frameWidth = 320;
    const giant = [
      { region: "North", a: 1_450_000_000_007 },
      { region: "South", a: 900_000_000_007 },
    ];
    inLocale(<BarChart title="Regions" data={giant} index="region" categories={["a"]} layout="horizontal" valueFormatter={euro} />, "tr-TR");
    const ticks = xTicks();
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.some(splitsUnit)).toBe(false);
    expect(ticks.every((tick) => tick.lines.length === 1)).toBe(true);
    expect(ticks.filter((tick) => tick.shortened).map((tick) => tick.lines[0])).toContain("€ 1,5\u00a0Tn");
  });

  it("RTL, ar-EG: compact in Arabic-Indic digits on the right-hand axis", () => {
    const egp = intl("ar-EG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    inLocale(<LineChart title="الإيرادات" data={[{ month: "يونيو", net: 1_450_000_000_000_000 }]} index="month" categories={["net"]} valueFormatter={egp} />, "ar-EG");
    const ticks = yTicks();
    expect(ticks.at(-1)!.lines[0]).toContain("١٥٠");
    expect(ticks.at(-1)!.lines[0]).toContain("ترليون");
    expect(ticks.at(-1)!.lines[0]).toContain("€");
    expect(ticks.at(-1)!.full).toBe(egp(1_500_000_000_000_000));
    expect(document.querySelector(".recharts-yAxis-tick-labels text")!.getAttribute("text-anchor")).toBe("start");
  });

  it("Composed: each axis decides for its own ticks", () => {
    inLocale(
      <ComposedChart
        title="Price"
        data={[{ week: "W1", orders: 120, price: 145_000_000_000_000 }]}
        index="week"
        bars={[{ key: "orders", axis: "left" }]}
        lines={[{ key: "price", axis: "right" }]}
        valueFormatters={{ left: String, right: euro }}
      />,
      "tr-TR",
    );
    const [left, right] = [...document.querySelectorAll(".recharts-yAxis-tick-labels")];
    expect([...left!.querySelectorAll("text")].some((text) => text.hasAttribute("data-shortened"))).toBe(false);
    expect([...right!.querySelectorAll("text")].map((text) => text.textContent)).toContain("€ 150.000.000.000.000€ 150\u00a0Tn");
  });

  it("Scatter: the y axis beside its name is compact too", () => {
    inLocale(<ScatterChart title="Price" data={[{ product: "A", price: 54, revenue: 145_000_000_000_000 }]} name="product" x="price" y="revenue" xLabel="Price" yLabel="Revenue" valueFormatters={{ y: euro }} />, "tr-TR");
    expect(shown(yTicks()).at(-1)).toBe("€ 160\u00a0Tn");
    expect(yTicks().some(splitsUnit)).toBe(false);
  });

  it("the server draws the ticks the browser draws", () => {
    const tick = (
      <DesignSystemProvider locale="tr-TR" navigate={vi.fn()}>
        <svg>
          <ValueTick x={40} y={10} width={120} payload={{ value: 150_000_000_000_000 }} tickFormatter={euro as never} textAnchor="end" axisTicks={[0, 150_000_000_000_000]} />
        </svg>
      </DesignSystemProvider>
    );
    const server = renderToString(tick);
    expect(server).toContain("€ 150\u00a0Tn");
    render(tick);
    expect(document.querySelector("[data-slot='chart-value-tick'] tspan")!.textContent).toBe("€ 150\u00a0Tn");
  });
});

describe("textWidth is an upper bound in every script and face", () => {
  // Measured one by one in Chromium, at 11px hinted and at the true advance, in Geist, its next/font fallback (Arial
  // at size-adjust 104.76%), Arial, system-ui, Noto Sans and DejaVu Sans; checked against 10,317 formatted numbers
  // of 246 locales and every numbering system (none wider than its estimate).
  it("letters and figures past the Latin, Greek, Cyrillic, Armenian, Hebrew and Arabic tables count at their script's widest", () => {
    // Tamil "ஆ" (a compact suffix) draws 14.4px; Myanmar figures 8px; Georgian letters 7px.
    expect(textWidth("ஆ")).toBeGreaterThanOrEqual(15);
    expect(textWidth("၉", "tabular")).toBeGreaterThanOrEqual(8);
    expect(textWidth("ხ")).toBeGreaterThanOrEqual(7);
    // Armenian is measured letter by letter ("ա" 10.72px).
    expect(textWidth("ա")).toBe(11);
    // A script the table does not name counts at the widest letter of any (36px, a cuneiform sign).
    expect(textWidth("𒒄")).toBe(36);
  });

  it("ligature letters at their measured width, no longer as a plain lowercase letter's 7px", () => {
    expect(textWidth("æ")).toBe(11);
    expect(textWidth("œ")).toBe(12);
    expect(textWidth("Æ")).toBe(12);
    expect(textWidth("ß")).toBe(8);
  });

  it("Geist's next/font fallback (Arial 104.76%) and the wide capitals are counted", () => {
    // Arial's "W" at 104.76% is 10.87px, 11 hinted; Cyrillic "Ѡ" 16px in Noto Sans.
    expect(textWidth("W")).toBe(11);
    expect(textWidth("Ѡ")).toBe(16);
    // "EUR 1 234 567,89" (nl) drew 105px in the fallback against a 103px estimate before.
    expect(textWidth("-EUR 1\u00a0234\u00a0567,89")).toBeGreaterThanOrEqual(105);
  });
});

describe("category ticks stay inside the chart", () => {
  const LAB = [
    { month: "Jun", revenue: 31_000 },
    { month: "Jul", revenue: 42_000 },
    { month: "Sep", revenue: 37_400 },
  ];
  const clip = () => {
    const rect = document.querySelector(".recharts-surface defs clipPath rect")!;
    return { x: Number(rect.getAttribute("x")), width: Number(rect.getAttribute("width")) };
  };
  const lastTick = () => {
    const ticks = [...document.querySelectorAll(".recharts-xAxis-tick-labels text")];
    return ticks.find((tick) => tick.textContent === "Sep")!;
  };

  it("Area and Line charts give the last period the room for its half, on the end side in both directions", () => {
    const half = Math.ceil(textWidth("Sep", "tabular") / 2);
    expect(half).toBeGreaterThan(4);
    inLocale(<AreaChart title="Revenue" data={LAB} index="month" categories={["revenue"]} valueFormatter={euro} />);
    expect(640 - clip().x - clip().width).toBe(half);
    expect(Number(lastTick().getAttribute("x")) + textWidth("Sep", "tabular") / 2).toBeLessThanOrEqual(640);
    cleanup();
    inLocale(<LineChart title="Revenue" data={LAB} index="month" categories={["revenue"]} valueFormatter={euro} />, "ar-EG");
    expect(clip().x).toBe(half);
    expect(Number(lastTick().getAttribute("x")) - textWidth("Sep", "tabular") / 2).toBeGreaterThanOrEqual(0);
  });

  it("a short last period keeps the 4px edge", () => {
    inLocale(<LineChart title="Revenue" data={[{ month: "A", revenue: 1 }, { month: "B", revenue: 2 }]} index="month" categories={["revenue"]} />);
    expect(640 - clip().x - clip().width).toBe(4);
  });

  it("a band's tick wider than its band moves in from the chart's edge just enough; others stay centred", () => {
    const tick = (x: number, text = "Closing balance, net") => {
      render(
        <svg>
          <CategoryTick x={x} y={10} payload={{ value: text }} textAnchor="middle" />
        </svg>,
      );
      const at = Number(document.querySelector("text")!.getAttribute("x"));
      cleanup();
      return at;
    };
    // Outside a chart there is no width to keep to: Recharts' place.
    expect(tick(630)).toBe(630);
    // In a 320px waterfall the last step's long name stays within the svg.
    frameWidth = 320;
    inLocale(<WaterfallChart title="Net" steps={[{ name: "Revenue", value: 48_200 }, { name: "Upkeep", value: -6_700 }]} endLabel="Closing balance, net" valueFormatter={euro} />);
    const svg = Number(document.querySelector(".recharts-surface")!.getAttribute("width"));
    const names = [...document.querySelectorAll(".recharts-xAxis-tick-labels text")];
    // Each stays on its band's centre (Recharts' x); one whose estimated box could reach an edge takes the CSS clamp
    // that moves it in by its drawn width (edgeShift), as a value tick under the plot does.
    for (const name of names) {
      const x = Number(name.getAttribute("x"));
      const shift = edgeShift([name.textContent ?? ""], x, svg, 11);
      expect((name as SVGElement).style.transform, name.textContent ?? "").toBe(shift?.transform ?? "");
    }
    expect(names.some((name) => (name as SVGElement).style.transform.startsWith("translateX(clamp("))).toBe(true);
  });
});

describe("WaterfallChart's value axis as the other charts size theirs", () => {
  it("from its ticks' estimated widths, a negative one with its minus, 56px at least", () => {
    // Recharts' ticks for -6.700…48.200: -20.000 to 60.000; "−€ 20.000" is the longest.
    expect(waterfallAxisWidth(-6700, 48200, euro)).toBe(textWidth("−€ 20.000", "tabular") + TICK_INSET);
    expect(waterfallAxisWidth(0, 40, euro)).toBe(56);
    expect(waterfallAxisWidth(-1_250_000, 0, euro)).toBe(textWidth("−€ 1.400.000", "tabular") + TICK_INSET);
    expect(waterfallAxisWidth(-1e11, 0, euro)).toBe(textWidth("−€ 100.000.000.000", "tabular") + TICK_INSET);
    expect(waterfallAxisWidth(-1e12, 0, euro)).toBe(AXIS_MAX);
    expect(waterfallAxisWidth(-1e15, 0, euro)).toBe(AXIS_MAX);
    // With the chart's locale, past the clamp: compact, and sized for that.
    expect(waterfallAxisWidth(-1e15, 0, euro, "tr-TR")).toBe(textWidth("−€ 1000\u00a0Tn", "tabular") + TICK_INSET);
  });

  it("each tick is given the axis's room less the inset; past the clamp the ticks are compact", () => {
    inLocale(<WaterfallChart title="Net" steps={[{ name: "Revenue", value: 1_250_000 }, { name: "Upkeep", value: -300_000 }]} endLabel="Net" valueFormatter={euro} />, "tr-TR");
    const width = waterfallAxisWidth(0, 1_250_000, euro, "tr-TR");
    const tick = document.querySelector(".recharts-yAxis-tick-labels text")!;
    expect(tick.getAttribute("width")).toBe(String(tickWrapWidth(width)));
    expect(Number(tick.getAttribute("x")) - 4 + TICK_INSET).toBe(width);
    cleanup();
    inLocale(<WaterfallChart title="Net" steps={[{ name: "Revenue", value: 145_000_000_000_000 }, { name: "Costs", value: -1_000_000 }]} endLabel="Net" valueFormatter={euro} />, "tr-TR");
    const ticks = yTicks();
    expect(ticks.some((tick) => tick.shortened)).toBe(true);
    expect(ticks.some(splitsUnit)).toBe(false);
    expect(ticks.every((tick) => tick.lines.length === 1)).toBe(true);
  });
});

describe("compact ticks are exact, and the last resort never cuts a word", () => {
  const LOCALES = ["tr-TR", "en-US", "ru-RU", "ar", "ar-EG"] as const;
  /** The value a compact tick names, read back with the locale's own magnitudes ("Mn" a million, "ترليون" a trillion). */
  const valueOf = (shown: string, locale: string) => {
    const magnitudes = new Map<string, number>();
    for (let power = 3; power <= 18; power += 1) {
      const parts = new Intl.NumberFormat(locale, { notation: "compact" }).formatToParts(10 ** power);
      const word = parts.find((part) => part.type === "compact")?.value;
      const integer = Number(parts.filter((part) => part.type === "integer").map((part) => latin(part.value)).join(""));
      if (word && !magnitudes.has(word)) magnitudes.set(word, 10 ** power / integer);
    }
    const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === "decimal")!.value;
    // Scientific notation too, with the locale's exponent sign ("E", "أس").
    const exponent = new Intl.NumberFormat(locale, { notation: "scientific" }).formatToParts(1500).find((part) => part.type === "exponentSeparator")!.value;
    const text = latin(shown).split(decimal).join(".").split(exponent).join("E");
    const scientific = /(\d+(?:\.\d+)?)E(\d+)/.exec(text);
    if (scientific) return Number(scientific[1]) * 10 ** Number(scientific[2]);
    const figure = /\d+(?:\.\d+)?/.exec(text)!;
    const word = [...magnitudes.keys()].sort((a, b) => b.length - a.length).find((key) => text.slice(figure.index + figure[0].length).includes(key));
    return Number(figure[0]) * (word ? magnitudes.get(word)! : 1);
  };
  const latin = (text: string) => text.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660)).replace(/٫/g, ".");
  const shownAxis = (ticks: readonly number[], format: (value: number) => string, room: number, locale: string) => {
    const texts = ticks.map(format);
    return texts.map((text) => tickText(text, room, locale, texts));
  };

  // One test a locale: as one test the sweep took 4.8s alone and 5.2s beside the other chart files, past
  // vitest's 5s default; a locale's share takes 0.3–0.4s, the same values checked, each with over 50 shortened ticks.
  for (const locale of LOCALES) it(`a shortened tick names exactly its gridline's value, in ${locale}, negatives too`, () => {
    let checked = 0;
    {
      const format = intl(locale, { style: "currency", currency: "EUR" });
      for (const max of [2_200_000, 1_900_000, 3_600_000, 9_500_000, 2_200_000_000_000, 1_950_000_000_000, 1_300_000_000_000_000, 770_000_000]) {
        for (const values of [[max], [-0.6 * max, max]]) {
          const ticks = valueAxisTicks(values, 4);
          for (const room of [56, 64, 80, AXIS_MAX - TICK_INSET]) {
            shownAxis(ticks, format, room, locale).forEach((tick, index) => {
              if (!tick.shortened || tick.lines.join(" ").includes("…")) return;
              checked += 1;
              const value = Math.abs(ticks[index]!);
              expect(valueOf(tick.lines.join(" "), locale), `${locale} ${format(ticks[index]!)} → ${tick.lines.join(" | ")}`).toBeCloseTo(value, -Math.log10(value || 1) + 9);
            });
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("0.25 and 0.65 steps keep their digits, one count of digits a magnitude", () => {
    const lira = intl("tr-TR", { style: "currency", currency: "TRY" });
    const ticks = valueAxisTicks([2_200_000_000_000], 4);
    expect(shownAxis(ticks, lira, AXIS_MAX - TICK_INSET, "tr-TR").map((tick) => tick.lines.join(" | "))).toEqual(["₺0,00", "₺750\u00a0Mr", "₺1,50\u00a0Tn", "₺2,25\u00a0Tn"]);
    // About 64px of room: "€ 2,3 Mn" and "€ 2 Mn" were shown for 2.250.000 and 1.950.000.
    expect(shownAxis(valueAxisTicks([2_200_000], 4), euro, 64, "tr-TR").map((tick) => tick.lines[0])).toEqual(["€ 0", "€ 750\u00a0B", "€ 1,50\u00a0Mn", "€ 2,25\u00a0Mn"]);
    expect(shownAxis(valueAxisTicks([1_900_000], 4), euro, 64, "tr-TR").map((tick) => tick.lines[0])).toEqual(["€ 0", "€ 650\u00a0B", "€ 1,30\u00a0Mn", "€ 1,95\u00a0Mn"]);
    const step = [0, 650_000_000_000, 1_300_000_000_000, 1_950_000_000_000];
    const of = (locale: string) => shownAxis(step, intl(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), 100, locale).map((tick) => tick.lines.join(" | "));
    expect(of("en-US")).toEqual(["€0", "€650B", "€1.30T", "€1.95T"]);
    expect(of("ru-RU")).toEqual(["0\u00a0€", "650\u00a0млрд\u00a0€", "1,30\u00a0трлн\u00a0€", "1,95\u00a0трлн\u00a0€"]);
    expect(of("ar-EG")).toEqual(["\u200f٠\u00a0€", "\u200f٦٥٠\u00a0مليار\u00a0€", "\u200f١٫٣٠\u00a0ترليون\u00a0€", "\u200f١٫٩٥\u00a0ترليون\u00a0€"]);
    // Negatives keep their sign, and their figure is exact.
    const signed = shownAxis([-1_300_000_000_000, -650_000_000_000, 0, 650_000_000_000], intl("tr-TR", { style: "currency", currency: "EUR" }), 80, "tr-TR");
    expect(signed.map((tick) => tick.lines[0])).toEqual(["-€1,3\u00a0Tn", "-€650\u00a0Mr", "€0,00", "€650\u00a0Mr"]);
  });

  it("where the shared digits do not fit, each figure has only those it needs, still exact", () => {
    const ticks = valueAxisTicks([9_500_000], 5);
    expect(shownAxis(ticks, euro, 60, "tr-TR").map((tick) => tick.lines[0])).toEqual(["€ 0", "€ 2,5\u00a0Mn", "€ 5,0\u00a0Mn", "€ 7,5\u00a0Mn", "€ 10,0\u00a0Mn"]);
    expect(shownAxis(ticks, euro, 56, "tr-TR").map((tick) => tick.lines[0])).toEqual(["€ 0", "€ 2,5\u00a0Mn", "€ 5\u00a0Mn", "€ 7,5\u00a0Mn", "€ 10\u00a0Mn"]);
  });

  it("the axis is sized for the exact ticks it shows", () => {
    const lira = intl("tr-TR", { style: "currency", currency: "TRY" });
    const texts = valueAxisTicks([2_200_000_000_000], 4).map(lira);
    expect(tickAxisWidth(texts, 48, 0, "tr-TR")).toBe(textWidth("₺2,25\u00a0Tn", "tabular") + TICK_INSET);
  });

  it("\"…\" follows whole words only; the figure, its magnitude and its currency sign are never cut", () => {
    const cases: [string, string][] = [
      ["tr-TR", "€ 12.000.000.000 net this month"],
      ["ru-RU", `${intl("ru-RU", { style: "currency", currency: "EUR" })(12_000_000_000)} нетто за месяц`],
      ["ar", `${intl("ar", { style: "currency", currency: "EUR" })(1_500_000_000_000)} صافي هذا الشهر`],
      ["en-US", "€1,500,000,000,000 net this month"],
      ["tr-TR", intl("tr-TR", { style: "currency", currency: "EUR" })(1_500_000_000_000)],
      ["ar-EG", intl("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 })(150_000_000_000_000)],
    ];
    for (const [locale, text] of cases) {
      const words = new Set(text.split(/\s+/u));
      for (let room = 4; room <= 130; room += 2) {
        const { lines } = tickText(text, room, locale);
        for (const line of lines) {
          if (!line.includes("…")) continue;
          const cut = line.replace(/…\u200f?$/u, "");
          const last = cut.split(/\s+/u).at(-1)!;
          // The word before "…" is a whole word of the tick, or the compact figure's magnitude: never a figure or a
          // piece of a word ("€ 12 мл…", "€ 1.5 ترل…", "€ 1.5…", "€ 1,…").
          const magnitude = new Intl.NumberFormat(locale, { notation: "compact" }).formatToParts(10 ** 12).concat(new Intl.NumberFormat(locale, { notation: "compact" }).formatToParts(10 ** 9)).filter((part) => part.type === "compact").map((part) => part.value);
          expect(words.has(last) || magnitude.some((word) => last.endsWith(word)) || /^[^\p{L}\p{Nd}]+$/u.test(last), `${locale} ${room}: ${line}`).toBe(true);
          expect(/[\p{Nd}.,٫٬]$/u.test(cut), `${locale} ${room}: ${line}`).toBe(false);
        }
      }
    }
    expect(tickText("€ 12.000.000.000 net this month", 70, "tr-TR").lines).toEqual(["€ 12\u00a0Mr net", "this month"]);
    // "€ 12 Mr…" is 57px: in 50px the figure stands without the "…" that does not fit beside it.
    expect(tickText("€ 12.000.000.000 net this month", 57, "tr-TR").lines).toEqual(["€ 12\u00a0Mr…"]);
    expect(tickText("€ 12.000.000.000 net this month", 50, "tr-TR")).toEqual({ lines: ["€ 12\u00a0Mr"], shortened: true });
    expect(tickText("€1,500,000,000,000 net this month", 50, "en-US").lines).toEqual(["€1.5T…"]);
  });

  it("what cannot be shortened without a cut is kept whole, and the axis stays within 128px", () => {
    const long = "Averyveryverylongunitnamehere this month";
    // Its words after the first are dropped; the first, wider than the room, is clipped by the tick (no "…" fits).
    expect(tickText(long, AXIS_MAX - TICK_INSET, "tr-TR")).toEqual({ lines: ["Averyveryverylongunitnamehere"], shortened: true });
    expect(textWidth("Averyveryverylongunitnamehere", "tabular")).toBeGreaterThan(AXIS_MAX - TICK_INSET);
    expect(tickAxisWidth([long], 48, 0, "tr-TR")).toBe(AXIS_MAX);
  });
});

describe("currencies, phrases, clipping, signs and marks", () => {
  const lines = (text: string, room: number, locale: string, axis: readonly string[] = []) => tickText(text, room, locale, axis).lines;
  const fits = (line: string, room: number) => textWidth(line, "tabular") <= room;
  const huge = [
    { month: "Jun", net: 1_450_000_000_000 },
    { month: "Jul", net: 900_000_000_000 },
  ];
  /** The plot's box: the chart's clip rect. */
  const plot = () => {
    const rect = document.querySelector(".recharts-surface defs clipPath rect")!;
    return { x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")), width: Number(rect.getAttribute("width")) };
  };

  it("the last resort keeps the figure's own currency or unit, as the magnitude; only qualifiers drop", () => {
    const cases: [string, string, string][] = [
      // [the chart's locale, the tick, what the figure must keep in every room]
      ["tr-TR", intl("tr-TR", { style: "currency", currency: "TRY", currencyDisplay: "name" })(150e12), "Türk lirası"],
      ["tr-TR", `${intl("tr-TR", { minimumFractionDigits: 2 })(150e12)} Türk lirası net this month`, "Türk lirası"],
      ["ar-EG", intl("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 })(150e12), "ج.م."],
      ["ar", "1.500.000.000.000 TL net this month", "TL"],
      ["tr-TR", "TRY 1.450.000.000.000 net this month", "TRY"],
      ["tr-TR", `${intl("tr-TR", { style: "unit", unit: "kilometer" })(12e12)} in total this month`, "km"],
      ["en-US", `${intl("en-US", { style: "unit", unit: "kilometer", unitDisplay: "long" })(12e12)} in total this month`, "kilometers"],
      ["ru-RU", `${intl("ru-RU", { style: "currency", currency: "EUR" })(12e12)} нетто за месяц`, "€"],
    ];
    for (const [locale, text, own] of cases) {
      for (let room = 20; room <= AXIS_MAX - TICK_INSET; room += 4) {
        const shown = lines(text, room, locale).join(" ").replace(/\s+/gu, " ");
        expect(shown, `${locale} ${room}: ${shown}`).toContain(own);
      }
    }
    // The currency stays where "…" took it before.
    expect(lines(intl("tr-TR", { style: "currency", currency: "TRY", currencyDisplay: "name" })(150e12), 56, "tr-TR").join(" ")).toContain("Türk lirası");
    // In 80px "١٥٠ ترليون ج.م." does not fit, and in scientific notation it does: exact, the pound kept.
    expect(lines(intl("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 })(150e12), 80, "ar-EG")).toEqual(["\u200f١٫٥أس١٤\u00a0ج.م.\u200f"]);
    // What drops is a qualifier, whole, and "…" stands for it where it fits.
    expect(lines("€ 145.000.000.000.000 net this month", 64, "tr-TR")).toEqual(["€ 145\u00a0Tn…"]);
    expect(lines(`${intl("ru-RU", { style: "currency", currency: "EUR" })(12e12)} нетто за месяц`, 60, "ru-RU")).toEqual(["12\u00a0трлн\u00a0€"]);
  });

  it("a phrase before the figure stands on a line of its own above it, its last words dropped for \"…\"", () => {
    const text = "Total order value € 145.000.000.000.000 net this month";
    expect(lines(text, 80, "tr-TR")).toEqual(["Total order…", "€ 145\u00a0Tn…"]);
    expect(lines(text, 56, "tr-TR")).toEqual(["Total…", "€ 145\u00a0Tn"]);
    // With the room for it, the phrase wraps between its words as any label does.
    expect(lines(text, AXIS_MAX - TICK_INSET, "tr-TR")).toEqual(["Total order", "value € 145\u00a0Tn net", "this month"]);
    for (let room = 40; room <= AXIS_MAX - TICK_INSET; room += 2) {
      const shown = lines(text, room, "tr-TR");
      expect(shown.length, `${room}: ${shown.join(" | ")}`).toBeLessThanOrEqual(3);
      expect(shown.join(" "), `${room}`).toContain("€ 145\u00a0Tn");
      // Each line fits, but for the figure's group alone in a room narrower than it (the tick clips it).
      for (const line of shown) expect(fits(line, room) || line === "€ 145\u00a0Tn", `${room}: ${line}`).toBe(true);
    }
    // A currency code before the figure is the figure's, not the phrase's.
    expect(lines("Total revenue TRY 1.450.000.000 net", 80, "tr-TR")).toEqual(["Total revenue", "TRY 1,45\u00a0Mr"]);
    // After a right-to-left word the "…" takes a right-to-left mark.
    const [lead, figure] = lines("إجمالي إيرادات المبيعات € 150.000.000.000.000 صافي هذا الشهر", 80, "ar");
    expect(lead).toMatch(/^إجمالي.*…\u200f$/u);
    // "€ 150 ترليون" does not fit 80px; in scientific notation it does.
    expect(figure).toMatch(/^€ 1\.5E14/u);
  });

  it("an axis the DS sizes never passes 128px; a tick that still does not fit is clipped within the axis, never over the plot", () => {
    const xs = (value: number) => `${euro(value)}${"x".repeat(30)}`;
    expect(tickAxisWidth(valueAxisTicks([1_450_000_000_000], 4).map(xs), 48, 0, "tr-TR")).toBe(AXIS_MAX);
    for (const locale of ["tr-TR", "ar-EG"]) {
      frameWidth = 320;
      inLocale(<LineChart title="xx" data={huge} index="month" categories={["net"]} valueFormatter={xs} />, locale);
      const box = plot();
      // The plot keeps all but the 128px axis and the chart's edges.
      expect(box.width, locale).toBeGreaterThanOrEqual(320 - AXIS_MAX - 24);
      const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-yAxis-tick-labels text")];
      const clipped = ticks.filter((tick) => tick.hasAttribute("data-clipped"));
      expect(clipped.length, locale).toBeGreaterThan(0);
      let rightToLeft = 0;
      for (const tick of clipped) {
        const id = /url\(#(.+)\)/.exec(tick.getAttribute("clip-path") ?? "")![1]!;
        const rect = document.getElementById(id)!.querySelector("rect")!;
        const start = Number(rect.getAttribute("x"));
        const end = start + Number(rect.getAttribute("width"));
        // Within the axis: clear of the plot, inside the chart.
        if (locale === "tr-TR") expect(end).toBeLessThanOrEqual(box.x);
        else expect(start).toBeGreaterThanOrEqual(box.x + box.width);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(320);
        // Its reading start in view: drawn from the room's edge its line starts to read at (the figure's currency and
        // digits first): the left for "€ 1.450.000…", the right for a line whose first strong letter is Arabic, as the
        // ar-EG chart's compact "€ 1,45 ترليون…".
        expect(tick.getAttribute("text-anchor")).toBe("start");
        const line = tick.querySelector("tspan")!;
        expect(Number(tick.getAttribute("x"))).toBe(line.getAttribute("direction") === "rtl" ? end : start);
        // tr-TR's ticks read from the left; ar-EG's compact ones ("€ 1,45 ترليون…") from the right, "€ 0…" from the left.
        if (locale === "tr-TR" || !/\p{Script=Arabic}/u.test(line.textContent ?? "")) expect(line.getAttribute("direction"), line.textContent ?? "").toBe("ltr");
        else {
          expect(line.getAttribute("direction"), line.textContent ?? "").toBe("rtl");
          rightToLeft += 1;
        }
        // The whole tick its name and title.
        expect(tick.getAttribute("aria-label")).toMatch(/^€ [\d.]+x{30}$/);
        expect(tick.querySelector("title")!.textContent).toBe(tick.getAttribute("aria-label"));
      }
      if (locale === "ar-EG") expect(rightToLeft).toBeGreaterThan(0);
      cleanup();
    }
  });

  it("the axis is sized for the ticks it draws: a long phrase in an Arabic chart is compact in both passes", () => {
    const ar = intl("ar", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    const words = (value: number) => `Total order value ${ar(value)} net this month`;
    inLocale(<LineChart title="prefix" data={[{ month: "Jun", net: 145_000_000_000_000 }, { month: "Jul", net: 90_000_000_000_000 }]} index="month" categories={["net"]} valueFormatter={words} />, "ar");
    const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-yAxis-tick-labels text")];
    const room = Number(ticks[0]!.getAttribute("width"));
    expect(room).toBeLessThanOrEqual(AXIS_MAX - TICK_INSET);
    for (const tick of ticks) {
      expect(tick.hasAttribute("data-clipped")).toBe(false);
      for (const span of tick.querySelectorAll("tspan")) expect(fits(span.textContent ?? "", room), span.textContent ?? "").toBe(true);
    }
    expect(ticks.at(-1)!.textContent).toContain("ترليون");
  });

  it("a sign or a dash before a figure stays with it; a unit's \"/\" does not part it; figure lists still part", () => {
    const units = (text: string) => textUnits(text).map((unit) => unit.unit);
    expect(units("– 350.000 €")).toEqual(["– 350.000 €"]);
    expect(units("— 350.000 €")).toEqual(["— 350.000 €"]);
    expect(units("120 km / h")).toEqual(["120 km / h"]);
    expect(units("€ 1.450.000 | target")).toEqual(["€ 1.450.000 | target"]);
    // Between two figures, each with its words, a separator still parts them.
    expect(units("€ 900.000 / € 1.450.000 target")).toEqual(["€ 900.000 /", "€ 1.450.000 target"]);
    expect(units("€ 900 – € 1.450")).toEqual(["€ 900 –", "€ 1.450"]);
    expect(units("12 orders, 3 returns")).toEqual(["12 orders,", "3 returns"]);
    // So a narrow label or tick never stands a dash over its figure, nor "h" under "120 km /".
    expect(barLabelLines("– 350.000 €", 30)).toEqual(["– 350.000 €"]);
    expect(barLabelLines("120 km / h", 30)).toEqual(["120 km / h"]);
    expect(tickText("– 350.000 €", 30, "tr-TR").lines).toHaveLength(1);
  });

  it("a top value tick of several lines stays inside the chart: the top margin takes its lines past one", () => {
    expect(tickOverhang("€ 1.500.000 net this month", AXIS_MAX - TICK_INSET, "tr-TR")).toBe(6);
    expect(tickOverhang("€ 1.500.000", AXIS_MAX - TICK_INSET, "tr-TR")).toBe(0);
    expect(tickOverhang(undefined, AXIS_MAX - TICK_INSET, "tr-TR")).toBe(0);
    const data = [
      { month: "Jun", net: 1_450_000 },
      { month: "Jul", net: 900_000 },
    ];
    inLocale(<LineChart title="net" data={data} index="month" categories={["net"]} valueFormatter={(value) => `${euro(value)} net this month`} />, "tr-TR");
    const top = [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].at(-1)!;
    expect(top.querySelectorAll("tspan")).toHaveLength(2);
    // The plot starts 6px lower, so the tick's first line (half a line higher than a one-line tick's) stays in.
    expect(plot().y).toBe(8 + 6);
    cleanup();
    inLocale(<LineChart title="net" data={data} index="month" categories={["net"]} valueFormatter={euro} />);
    expect(plot().y).toBe(8);
    cleanup();
    inLocale(<BarChart title="net" data={data} index="month" categories={["net"]} valueFormatter={(value) => `${euro(value)} net this month`} />, "tr-TR");
    expect(plot().y).toBe(8 + 6);
  });

  it("a figure's marks are read only where they prove themselves or the axis's figures prove them", () => {
    // "1,500" from a de formatter is 1.5: in an en chart it was read as fifteen hundred, "1.5K". Nothing tells, so it
    // stays as written.
    expect(tickText(`1,500${"x".repeat(30)}`, 40, "en-US")).toEqual({ lines: [`1,500${"x".repeat(30)}`], shortened: false });
    expect(labelText("1,500 t", 10, 10, "en-US").lines).toEqual(["1,500 t"]);
    expect(labelText("1.500 t", 10, 10, "en-US").lines).toEqual(["1.500 t"]);
    // The axis tells: a leading zero ("0,500") or other than three digits after a mark make it the decimal mark…
    const de = ["0,000", "0,500", "1,000", "1,500"].map((tick) => `${tick} Tonnen insgesamt`);
    for (const tick of de) expect(tickText(tick, 40, "en-US", de).lines.join(" "), tick).not.toMatch(/K/);
    expect(tickText("1.500", 10, "tr-TR", ["2,5"]).lines).toEqual(["1,5\u00a0B"]);
    // …a mark that comes twice groups, in whichever locale the chart is.
    const thousands = ["0", "500.000", "1.000.000", "1.500.000"].map((tick) => `${tick} Tonnen`);
    expect(thousands.map((tick) => tickText(tick, 40, "en-US", thousands).lines[0])).toEqual(["0 Tonnen", "500K Tonnen", "1M Tonnen", "1.5M Tonnen"]);
    // A figure that proves its own marks needs no other: "1,450,000.00" and "1.450.000,00".
    // "1,45 Mio." alone is wider than 50px: in scientific notation, exact; compact where it fits.
    expect(tickText("1,450,000.00", 50, "de-DE").lines).toEqual(["1,45E6"]);
    expect(tickText("1,450,000.00", 60, "de-DE").lines).toEqual(["1,45\u00a0Mio."]);
  });
});
