import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { AXIS_MAX, TICK_INSET, clipDirection, formattedValues, labelText, readsRightToLeft, textWidth, tickText, tickWrapWidth, valueAxisTicks } from "./axis-width";
import { AreaChart, BarChart, ChartAnimation, LineChart, ScatterChart, WaterfallChart } from "./index";
import { CategoryTick, NameTick, ValueTick, anchorFor, bandLines, clippedLine, edgeShift, isolatedLabel, lineDirection } from "./value-tick";

/**
 * A clipped line keeps its reading start in view in its own direction (B1), a tick on an app-sized axis is clipped
 * within the axis (N1), a figure is read only where its marks are a formatter's (N2) and, with the values the ticks
 * were formatted from, where those prove them (N3), and one shortening chain for value ticks and bar-end labels,
 * scientific notation by fit (N4). Real Intl formatters throughout, Arabic ones too.
 */

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

const intl = (locale: string, options: Intl.NumberFormatOptions = {}) => {
  const format = new Intl.NumberFormat(locale, options);
  return (value: number) => format.format(value);
};
const arEgEuro = intl("ar-EG", { style: "currency", currency: "EUR" });
const arEuro = intl("ar", { style: "currency", currency: "EUR" });
const egp = intl("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 });
const enEuro = intl("en-US", { style: "currency", currency: "EUR" });
// Turkish figures (dot grouping, a decimal comma, "B", "Mr", "Tn"), where a test is about a locale's own marks.
const trEuro = intl("tr-TR", { style: "currency", currency: "EUR" });
const xs = (count: number) => "x".repeat(count);
const svgWidth = () => Number(document.querySelector(".recharts-surface")!.getAttribute("width"));
/** Each clipped text: its clip's edges, and each line with where and in which direction it is drawn. */
const clippedTexts = (selector: string) =>
  [...document.querySelectorAll<SVGTextElement>(selector)]
    .filter((text) => text.hasAttribute("clip-path"))
    .map((text) => {
      const id = /url\(#(.+)\)/.exec(text.getAttribute("clip-path")!)![1]!;
      const rect = document.getElementById(id)!.querySelector("rect")!;
      const left = Number(rect.getAttribute("x"));
      return {
        anchor: text.getAttribute("text-anchor"),
        clip: { left, right: left + Number(rect.getAttribute("width")) },
        lines: [...text.querySelectorAll("tspan")].map((span) => ({ text: span.textContent ?? "", x: Number(span.getAttribute("x")), direction: span.getAttribute("direction"), bidi: span.getAttribute("unicode-bidi") })),
        label: text.getAttribute("aria-label"),
      };
    });

describe("B1: a clipped line is drawn from the edge it starts to read at, in its own direction", () => {
  it("which lines read from the right: their first strong character (UAX #9 P2), with real Arabic formatters", () => {
    const rtl = [arEgEuro(1.5e14), arEuro(1_450_000), egp(1.5e14), `${arEgEuro(150)}${xs(30)}`, `إجمالي ${enEuro(1.5e14)}`, "‏١٥٠ ترليون €", "١٥٠", "۱۵۰"];
    // Figures, signs and currency signs are weak or neutral: a Latin figure before the first Arabic letter decides
    // nothing. Intl's "ar", "ar-MA", "ar-AE" and "ur" write Latin figures.
    rtl.push(`€ 1,5 ترليون ${xs(10)}`, "150 ترليون", "€ 50 ترليون", "0 كم", "150 ترليون USD");
    for (const value of [0, 15_000_000, 1.5e12]) {
      rtl.push(
        intl("ar", { notation: "compact", compactDisplay: "long" })(value),
        intl("ar", { style: "unit", unit: "kilometer" })(value),
        intl("ar", { style: "currency", currency: "USD", currencyDisplay: "name" })(value),
        intl("ar-MA", { style: "currency", currency: "MAD" })(value),
        intl("ar-AE", { notation: "compact" })(value),
        intl("ur", { notation: "compact", compactDisplay: "long" })(value),
      );
    }
    for (const text of rtl.filter((each) => /\p{L}|[\u0660-\u0669\u06f0-\u06f9]/u.test(each))) expect(readsRightToLeft(text), text).toBe(true);
    // A left-to-right letter or mark first reads from the left, a right-to-left word after it or not; a line with no
    // strong character at all ("0", "€ 1,450,000") reads in the plot's direction, left to right.
    const ltr = [enEuro(1.5e14), trEuro(1.5e14), `USD 1.5 ترليون ${xs(10)}`, intl("ru-RU", { style: "currency", currency: "EUR" })(1.5e14), "USD 1,450,000", "\u200e-150 ترليون", "5E6 كم", "€ 1,450,000", "12.4%", "%12,4", "0", "", "१५० खरब"];
    ltr.push(intl("ar", { notation: "compact", compactDisplay: "long" })(-1.5e14), intl("ur", { style: "currency", currency: "PKR" })(150));
    for (const text of ltr) expect(readsRightToLeft(text), text).toBe(false);
  });

  it("clippedLine: the clip's right edge and rtl for a line that reads from the right, its left edge and ltr otherwise", () => {
    expect(clippedLine(`\u200f١٥٠\u00a0ترليون\u00a0€${xs(30)}`, 10, 100, "tabular")).toEqual({ x: 110, direction: "rtl", anchor: "start" });
    // Its first strong character Arabic, after a Latin figure: from the right edge, "€ 1,5" there first.
    expect(clippedLine(`€ 1,5 ترليون ${xs(30)}`, 10, 100, "tabular")).toEqual({ x: 110, direction: "rtl", anchor: "start" });
    expect(clippedLine(`USD 1.5 ترليون ${xs(30)}`, 10, 100, "tabular")).toEqual({ x: 10, direction: "ltr", anchor: "start" });
  });

  it("clipDirection: the direction in which the line's first character is drawn inside the clip", () => {
    // Read from the right, its figure at the right edge: "١٥٠" stands first there, then the Arabic word, the tail left.
    expect(clipDirection(`\u200f١٥٠\u00a0ترليون\u00a0€${xs(30)}`, 60)).toBe("rtl");
    expect(clipDirection(`${arEgEuro(150)}${xs(30)}`, 60)).toBe("rtl");
    expect(clipDirection(`إجمالي ${arEgEuro(1.5e14)}${xs(30)}`, 60)).toBe("rtl");
    expect(clipDirection(`${egp(150)}${xs(30)}`, 60)).toBe("rtl");
    // A figure wider than the clip, read from the right: in rtl its first digit, at the figure's left, would be
    // clipped; from the left edge it is in view.
    expect(clipDirection(`${arEgEuro(1.5e14)}${xs(30)}`, 60)).toBe("ltr");
    // A right-to-left mark before a left-to-right run ("ar" formats in Latin figures; compact in an en chart writes "M",
    // "T"): in rtl the whole run would stand at the right edge with its figure at its far left. From the left edge instead.
    expect(clipDirection(`\u200f1.45M €${xs(30)}`, 60)).toBe("ltr");
    expect(clipDirection(`\u200f١٫٥T €${xs(30)}`, 60)).toBe("ltr");
    expect(clipDirection(`\u200f1,450,000.00 ₪${xs(30)}`, 60)).toBe("ltr");
    // Read from the left, a right-to-left run within it or not.
    expect(clipDirection(`${enEuro(1.5e14)}${xs(30)}`, 60)).toBe("ltr");
    expect(clipDirection(`USD 1.5 ترليون ${xs(30)}`, 60)).toBe("ltr");
    // Read from the right, its first strong letter Arabic after a Latin figure: "€ 1,5" at the
    // right edge, read first.
    expect(clipDirection(`€ 1,5 ترليون ${xs(30)}`, 60)).toBe("rtl");
    // Hebrew reads from the right too.
    expect(clipDirection(`סה"כ ${xs(30)}`, 60)).toBe("rtl");
  });

  for (const [anchor, x] of [["end", 120], ["start", 300]] as const) {
    it(`a value tick (text-anchor ${anchor}): each clipped line in its own isolated direction, from its reading start`, () => {
      const formats: [string, (value: number) => string][] = [
        ["ar-EG", (value) => `${arEgEuro(value)}${xs(30)}`],
        ["ar", (value) => `${arEuro(value)}${xs(30)}`],
        ["ar-EG", (value) => `إجمالي ${arEgEuro(value)}${xs(30)}`],
        ["en", (value) => `${enEuro(value)}${xs(30)}`],
        ["ar", (value) => `€ 1,5 ترليون ${xs(30)} ${value}`],
      ];
      for (const [locale, format] of formats) {
        render(
          <DesignSystemProvider locale={locale} navigate={vi.fn()}>
            <svg>
              <ValueTick x={x} y={50} width={112} textAnchor={anchor} payload={{ value: 1.5e14 }} tickFormatter={format as never} axisTicks={[0, 5e13, 1e14, 1.5e14]} />
            </svg>
          </DesignSystemProvider>,
        );
        const [tick] = clippedTexts("[data-slot='chart-value-tick']");
        expect(tick, format(1.5e14)).toBeDefined();
        expect(tick!.anchor).toBe("start");
        expect(tick!.label).toBe(format(1.5e14));
        for (const line of tick!.lines) {
          const rtl = clipDirection(line.text, 112, "tabular") === "rtl";
          expect(line.direction, line.text).toBe(rtl ? "rtl" : "ltr");
          expect(line.bidi).toBe("isolate");
          expect(line.x, line.text).toBe(rtl ? tick!.clip.right : tick!.clip.left);
        }
        cleanup();
      }
    });
  }

  it("a value tick that is not clipped stands where Recharts anchors it, in its own isolated direction", () => {
    render(
      <DesignSystemProvider locale="ar-EG" navigate={vi.fn()}>
        <svg>
          <ValueTick x={120} y={50} width={112} textAnchor="end" payload={{ value: 1_450_000 }} tickFormatter={arEgEuro as never} />
        </svg>
      </DesignSystemProvider>,
    );
    const span = document.querySelector("[data-slot='chart-value-tick'] tspan")!;
    // Read from the right: its right edge at the plot is its start.
    expect(span.getAttribute("direction")).toBe("rtl");
    expect(span.getAttribute("unicode-bidi")).toBe("isolate");
    expect(span.getAttribute("text-anchor")).toBe("start");
    expect(span.getAttribute("x")).toBe("120");
    expect(document.querySelector("[data-slot='chart-value-tick']")!.getAttribute("text-anchor")).toBe("end");
    expect(document.querySelector("[data-slot='chart-value-tick']")!.hasAttribute("clip-path")).toBe(false);
  });

  // The left-to-right chart is Turkish: its compact word stands apart from the figure ("\u200f1,45 Mn €"), so the line
  // reads from the right. In an English chart "\u200f1.45M €" is one left-to-right run, drawn from the left (clipDirection).
  for (const [dir, locale] of [["ltr", "tr-TR"], ["rtl", "ar-EG"]] as const) {
    it(`${dir}: a bar-end label of an Arabic currency formatter is drawn from its reading start at the clip's right edge`, () => {
      frameWidth = 320;
      const wide = (value: number) => `${arEuro(value)}${xs(40)}`;
      inLocale(<BarChart title="arl" data={[{ region: "North", a: 1_450_000 }, { region: "South", a: 9 }]} index="region" categories={["a"]} layout="horizontal" valueFormatter={wide} />, locale);
      const [label] = clippedTexts(".recharts-label-list text");
      expect(label).toBeDefined();
      expect(label!.label).toBe(wide(1_450_000));
      expect(label!.anchor).toBe("start");
      for (const line of label!.lines) {
        expect(line.direction).toBe("rtl");
        expect(line.x).toBe(label!.clip.right);
      }
    });
  }

  // An en formatter's euros in an ar-EG chart are compact in its words ("€1.45 مليونxxxx"): the first strong letter is
  // Arabic, so the line reads from the right, "€1.45" at the clip's right edge; one whose first strong letter is
  // Latin ("USD 1,450,000xxxx") reads from the left, at the clip's left edge.
  const labelFormats = [
    ["right", "rtl", (value: number) => `${enEuro(value)}${xs(40)}`],
    ["left", "ltr", (value: number) => `USD ${value.toLocaleString("en-US")}${xs(40)}`],
  ] as const;
  for (const [side, direction, wide] of labelFormats) {
    it(`a bar-end label that reads from the ${side} stays at the clip's ${side} edge, ${direction}`, () => {
      frameWidth = 320;
      inLocale(<BarChart title="xx" data={[{ region: "North", a: 1_450_000 }, { region: "South", a: 9 }]} index="region" categories={["a"]} layout="horizontal" valueFormatter={wide} />, "ar-EG");
      const [label] = clippedTexts(".recharts-label-list text");
      expect(label).toBeDefined();
      for (const line of label!.lines) {
        expect(line.direction, line.text).toBe(direction);
        expect(line.x, line.text).toBe(direction === "rtl" ? label!.clip.right : label!.clip.left);
      }
    });
  }
});

describe("N1: a tick on an app-sized axis is clipped within the axis, never past the chart's edge", () => {
  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar"]] as const) {
    it(`${dir}: AreaChart yAxisWidth={60} gives each tick the axis less its 8px inset`, () => {
      const wide = (value: number) => `€ ${value.toLocaleString("en-US")}${xs(30)}`;
      inLocale(<AreaChart title="aw" data={[{ month: "Jun", a: 1_450_000_000_000 }, { month: "Jul", a: 900_000_000_000 }]} index="month" categories={["a"]} yAxisWidth={60} valueFormatter={wide} />, locale);
      const ticks = [...document.querySelectorAll<SVGTextElement>("[data-slot='chart-value-tick']")];
      expect(ticks.length).toBeGreaterThan(0);
      for (const tick of ticks) expect(Number(tick.getAttribute("width"))).toBe(tickWrapWidth(60));
      const clipped = clippedTexts("[data-slot='chart-value-tick']");
      expect(clipped.length).toBeGreaterThan(0);
      for (const { clip } of clipped) {
        expect(clip.left).toBeGreaterThanOrEqual(0);
        expect(clip.right).toBeLessThanOrEqual(svgWidth());
        expect(clip.right - clip.left).toBe(tickWrapWidth(60));
      }
    });
  }

  it("an app width that fits its ticks keeps them whole and where they were", () => {
    inLocale(<AreaChart title="aw" data={[{ month: "Jun", a: 40_000 }, { month: "Jul", a: 31_000 }]} index="month" categories={["a"]} yAxisWidth={80} valueFormatter={(value) => `€ ${value.toLocaleString("en-US")}`} />);
    for (const tick of document.querySelectorAll("[data-slot='chart-value-tick']")) {
      expect(tick.hasAttribute("clip-path")).toBe(false);
      expect(tick.hasAttribute("data-shortened")).toBe(false);
    }
  });
});

describe("N2: a figure is read only where its marks group as a formatter groups", () => {
  const kept = (text: string, values?: ReadonlyMap<string, number>) => labelText(text, 10, 10, "en-US", values).lines.join(" ");
  it("IP addresses, dates, times and phone numbers are kept as written", () => {
    for (const text of ["192.168.1.1", "10.0.0.255", "15.10.2026", "2026.10.15", "14.30", "14:30:05", "0555 123 45 67", "+90 0555 123 4567", "1.4500.000", "12,34,5678"]) {
      expect(kept(text), text).toBe(text);
      expect(tickText(text, 10, "en-US", [text]).lines.join(" "), text).not.toMatch(/[KMB]\b|E\d/);
    }
  });

  it("with the value it was formatted from, a figure that is not that value is kept, however it is grouped", () => {
    // "192.168.100.200" groups in threes, as a de formatter writes 192 billion: only its value tells it is not one.
    expect(kept("192.168.100.200", new Map([["192.168.100.200", 5]]))).toBe("192.168.100.200");
    expect(kept("555 123 4567", new Map([["555 123 4567", 12]]))).toBe("555 123 4567");
    // The same figure as the value it writes is read.
    expect(labelText("1.500.000", 10, 10, "en-US", new Map([["1.500.000", 1_500_000]])).lines).toEqual(["1.5M"]);
  });

  it("grouping in threes and the Indian way are figures; their compact form is exact", () => {
    expect(labelText("1,450,000", 10, 10, "en-US").lines).toEqual(["1.45M"]);
    const inr = intl("en-IN", { style: "currency", currency: "INR" });
    expect(inr(14_500_000)).toBe("₹1,45,00,000.00");
    expect(labelText(inr(14_500_000), 10, 10, "en-IN", formattedValues([14_500_000], inr)).lines).toEqual(["₹1.45Cr"]);
  });
});

describe("N3: the values the ticks were formatted from prove a single mark", () => {
  const room = 40;
  for (const [locale, format, compact] of [
    ["en-US", intl("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), "€60K"],
    ["tr-TR", (value: number) => `€ ${value.toLocaleString("tr-TR")}`, "€ 60 B"],
  ] as const) {
    it(`${locale}: "${format(60_000)} net" at 0–60k is compact, its qualifier kept as long as it fits`, () => {
      const ticks = valueAxisTicks([58_000], 4);
      const texts = ticks.map((value) => `${format(value)} net`);
      const values = formattedValues(ticks, (value) => `${format(value)} net`);
      // Without the values nothing proves the lone mark, so nothing is compact: the qualifier is dropped instead.
      expect(tickText(texts.at(-1)!, room, locale, texts).lines.join(" ")).not.toContain(compact);
      expect(tickText(texts.at(-1)!, room, locale, texts, values).lines.join(" ")).toContain(compact);
    });
  }

  it("a de formatter's 1,500 (one and a half) in an en chart: its value proves the decimal mark, never fifteen hundred", () => {
    const de = intl("de-DE", { minimumFractionDigits: 3 });
    const ticks = [0, 0.5, 1, 1.5];
    const texts = ticks.map((value) => `${de(value)} Tonnen insgesamt bis heute`);
    const values = formattedValues(ticks, (value) => `${de(value)} Tonnen insgesamt bis heute`);
    for (const text of texts) expect(tickText(text, 40, "en-US", texts, values).lines.join(" ")).not.toMatch(/K/);
  });

  it("a chart's axis is compact by its values: en €60,000 ticks with a word too long for the axis", () => {
    const format = intl("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    inLocale(<LineChart title="en" data={[{ month: "Jun", a: 58_000 }, { month: "Jul", a: 31_000 }]} index="month" categories={["a"]} valueFormatter={(value) => `${format(value)} Gesamtumsatzerlöseüberschuss`} />, "en-US");
    const top = [...document.querySelectorAll("[data-slot='chart-value-tick']")].at(-1)!;
    expect([...top.querySelectorAll("tspan")].map((span) => span.textContent).join(" ")).toContain("€60K");
  });
});

describe("N4: one chain for ticks and labels, scientific notation by fit", () => {
  const jaEuro = intl("ja-JP", { style: "currency", currency: "EUR" });
  it("ja: past 京, compact keeps every digit above it; where that does not fit, scientific", () => {
    expect(labelText(jaEuro(1.5e29), 90, 90, "ja-JP").lines).toEqual(["€1.5E29"]);
    expect(tickText(jaEuro(1.5e29), 90, "ja-JP").lines).toEqual(["€1.5E29"]);
    // Where compact fits, it stays, in ja's own four-digit magnitudes.
    expect(labelText(jaEuro(1.5e15), 60, 60, "ja-JP").lines).toEqual(["€1500兆"]);
    expect(tickText(jaEuro(1.5e15), 60, "ja-JP").lines).toEqual(["€1500兆"]);
  });

  it("a label and a tick of one figure in one room take the same form", () => {
    for (const [locale, format] of [["tr-TR", trEuro], ["ru-RU", intl("ru-RU", { style: "currency", currency: "EUR" })], ["ar-EG", arEgEuro], ["ja-JP", jaEuro], ["en-US", intl("en-US", { style: "currency", currency: "EUR" })]] as const) {
      for (const value of [1.5e29, 1.5e20, 1.5e14, 1_450_000]) {
        for (const room of [60, 96, 120, 200]) {
          const text = format(value);
          const values = new Map([[text, value]]);
          // Labels count proportional figures, ticks tabular ones: compare where both fit the same way.
          const label = labelText(text, room, room, locale, values);
          const tick = tickText(text, room, locale, [], values);
          if (!label.shortened || !tick.shortened || /E/.test(label.lines.join("")) !== /E/.test(tick.lines.join(""))) continue;
          expect(label.lines, `${locale} ${text} ${room}`).toEqual(tick.lines);
        }
      }
    }
  });

  it("an axis is in scientific notation throughout when one compact figure does not fit, compact throughout otherwise", () => {
    const ticks = valueAxisTicks([1.5e29], 4);
    const texts = ticks.map(enEuro);
    const values = formattedValues(ticks, enEuro);
    const shown = texts.map((text) => tickText(text, AXIS_MAX - TICK_INSET, "en", texts, values).lines.join(" "));
    expect(shown).toEqual(["€0.00", "€5E28", "€1E29", "€1.5E29"]);
    const small = valueAxisTicks([1.5e15], 4);
    const smallTexts = small.map(enEuro);
    expect(smallTexts.map((text) => tickText(text, AXIS_MAX - TICK_INSET, "en", smallTexts, formattedValues(small, enEuro)).lines.join(" ")).every((text) => !/E/.test(text))).toBe(true);
  });

  it("the value ticks under horizontal bars are at most compact: nothing clips them, so never scientific", () => {
    frameWidth = 320;
    inLocale(<BarChart title="giant" data={[{ region: "North", a: 1.5e29 }, { region: "South", a: 9 }]} index="region" categories={["a"]} layout="horizontal" valueFormatter={enEuro} />);
    const texts = [...document.querySelectorAll(".recharts-xAxis-tick-labels text")];
    const ticks = texts.map((text) => [...text.querySelectorAll("tspan")].map((span) => span.textContent).join(" "));
    // Compact and exact, wider than the room or not: Recharts spaces these ticks by the whole formatted tick.
    expect(ticks).toEqual(["€0.00", "€50,000,000,000,000,000T", "€100,000,000,000,000,000T", "€150,000,000,000,000,000T"]);
    for (const text of texts) expect(text.hasAttribute("clip-path")).toBe(false);
    expect(texts.at(-1)!.getAttribute("aria-label")).toBe(enEuro(1.5e29));
  });
});

describe("Q1: scientific notation only where a line would otherwise be clipped", () => {
  const jaEuro = intl("ja-JP", { style: "currency", currency: "EUR" });
  const ruKm = (value: number) => `${value.toLocaleString("ru-RU")} km / hr`;
  const plainEuro = (value: number) => `€ ${value.toLocaleString("en-US")}`;
  /** An axis's ticks at `max`, as a tick beside the plot (`clips`) or under it shows them in `room`. */
  const axis = (format: (value: number) => string, max: number, room: number, locale: string, clips: boolean) => {
    const ticks = valueAxisTicks([max], 4);
    const texts = ticks.map(format);
    return texts.map((text) => tickText(text, room, locale, texts, formattedValues(ticks, format), clips).lines.join(" | "));
  };
  const SCIENTIFIC = /\dE\d|أس/u;

  it("under the plot compact, beside it scientific only where compact would be clipped (ar, ar-EG, ru, ja, tr)", () => {
    // ar and ar-EG charts of an en formatter's euros: "€ 1.5E12" was shown under the bars, where nothing clips.
    for (const locale of ["ar", "ar-EG"]) {
      expect(axis(plainEuro, 1.5e12, 76, locale, false)).toEqual(["€ 0", "€ 500\u00a0مليار", "€ 1\u00a0ترليون", "€ 1.5\u00a0ترليون"]);
      expect(axis(plainEuro, 1.5e12, 76, locale, true)).toEqual(["€ 0", "€ 5E11", "€ 1E12", "€ 1.5E12"]);
    }
    expect(axis(arEgEuro, 1.5e14, 76, "ar-EG", false)).toEqual(["\u200f٠٫٠٠\u00a0€", "\u200f٥٠\u00a0ترليون\u00a0€", "\u200f١٠٠\u00a0ترليون\u00a0€", "\u200f١٥٠\u00a0ترليون\u00a0€"]);
    // ru: "1,2E7 km / hr" under the bars; "12 млн km / hr" reads.
    expect(axis(ruKm, 12e6, 76, "ru-RU", false)).toEqual(["0 km / hr", "4\u00a0млн km / hr", "8\u00a0млн km / hr", "12\u00a0млн km / hr"]);
    expect(axis(ruKm, 12e6, 76, "ru-RU", true)).toEqual(["0 km / hr", "4E6 km / hr", "8E6 km / hr", "1,2E7 km / hr"]);
    // ja and tr past their largest magnitude: compact keeps the digits above it under the plot; beside it, where that
    // is clipped, scientific.
    expect(axis(jaEuro, 1.5e29, 90, "ja-JP", false).at(-1)).toBe("€15,000,000,000,000京");
    expect(axis(jaEuro, 1.5e29, 90, "ja-JP", true).at(-1)).toBe("€1.5E29");
    expect(axis(trEuro, 1.5e29, AXIS_MAX - TICK_INSET, "tr-TR", false).at(-1)).toBe("€150.000.000.000.000.000\u00a0Tn");
    expect(axis(trEuro, 1.5e29, AXIS_MAX - TICK_INSET, "tr-TR", true).at(-1)).toBe("€1,5E29");
    // Where compact fits, compact either way.
    expect(axis(jaEuro, 1.5e15, 60, "ja-JP", true).at(-1)).toBe("€1500兆");
  });

  it("under the plot only the chart's edge bounds a tick: a line wider than the whole chart takes the chain's last steps", () => {
    const ticks = valueAxisTicks([1.5e29], 4);
    const texts = ticks.map(enEuro);
    const values = formattedValues(ticks, enEuro);
    // Compact fits a 288px chart; in a 150px one it would be cut at the svg's edge: scientific, as beside the plot.
    expect(tickText(texts.at(-1)!, 76, "en", texts, values, false, 2, 288).lines).toEqual(["€150,000,000,000,000,000T"]);
    expect(tickText(texts.at(-1)!, 76, "en", texts, values, false, 2, 150).lines).toEqual(["€1.5E29"]);
    // A phrase wider than the chart drops its qualifiers for "…" there, its figure group whole.
    const long = (value: number) => `إجمالي إيرادات التأجير ${arEgEuro(value)} صافي هذا الشهر`;
    const shown = tickText(long(1_450_000), 76, "ar-EG", [long(0), long(1_450_000)], undefined, false, 2, 200).lines;
    for (const line of shown) expect(textWidth(line, "tabular"), line).toBeLessThanOrEqual(200);
    expect(shown.length).toBeLessThanOrEqual(2);
  });

  it("under the plot a tick is never shortened with \"…\" either: compact is its last step, whole words kept", () => {
    const format = (value: number) => `€ ${value.toLocaleString("en-US")} net this month`;
    // 52px: room for "€ 12B…" (46px), none for "€ 12B net" (56px).
    expect(axis(format, 12e9, 52, "en", true).at(-1)).toBe("€ 12B…");
    expect(axis(format, 12e9, 52, "en", false).at(-1)).toBe("€ 12B net this month");
    const ar = (value: number) => `${arEuro(value)} net this month`;
    for (const tick of axis(ar, 1.5e14, 76, "ar", false)) {
      expect(tick).not.toMatch(SCIENTIFIC);
      expect(tick).not.toContain("…");
      expect(tick).toContain("net this month".split(" ").at(-1)!);
    }
  });

  for (const [locale, format, max] of [
    ["ar", plainEuro, 1.5e12],
    ["ar-EG", arEgEuro, 1.5e14],
    ["ru-RU", ruKm, 12e6],
    ["ja-JP", jaEuro, 1.5e29],
    ["tr-TR", trEuro, 1.5e29],
  ] as const) {
    it(`${locale}: a horizontal BarChart's value ticks are never scientific nor "…"; its totals only where they would be clipped`, () => {
      frameWidth = 320;
      inLocale(<BarChart title="q1" data={[{ region: "North", a: max }, { region: "South", a: max / 3 }]} index="region" categories={["a"]} layout="horizontal" valueFormatter={format} />, locale);
      const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-xAxis-tick-labels text")];
      expect(ticks.length).toBeGreaterThan(1);
      for (const tick of ticks) {
        const shown = tick.textContent ?? "";
        expect(shown, shown).not.toMatch(SCIENTIFIC);
        expect(shown, shown).not.toContain("…");
        expect(tick.hasAttribute("clip-path")).toBe(false);
      }
      // A total in scientific notation is one whose compact form, even with its words dropped, would be clipped.
      for (const label of document.querySelectorAll<SVGTextElement>(".recharts-label-list text")) {
        const shown = label.textContent ?? "";
        if (!SCIENTIFIC.test(shown)) continue;
        const room = 1_000;
        expect(labelText(label.getAttribute("aria-label")!, room, room, locale).lines.join(" ")).not.toMatch(SCIENTIFIC);
      }
    });
  }

  it("beside the plot an axis takes scientific notation throughout when one tick would be clipped compact", () => {
    for (const [locale, format] of [["ja-JP", jaEuro], ["tr-TR", trEuro]] as const) {
      inLocale(<LineChart title="sci" data={[{ month: "Jun", a: 1.5e29 }, { month: "Jul", a: 9e28 }]} index="month" categories={["a"]} valueFormatter={format} />, locale);
      const ticks = [...document.querySelectorAll("[data-slot='chart-value-tick']")].map((tick) => tick.textContent ?? "");
      expect(ticks.slice(1).every((tick) => SCIENTIFIC.test(tick)), ticks.join(" ")).toBe(true);
      cleanup();
    }
  });
});

describe("the x band guard: a tick under the plot takes no more lines than its band holds", () => {
  const long = (value: number) => `Total sales revenue € ${value.toLocaleString("en-US")} net this month overall`;
  it("laid out wider in no more lines, every word kept, never \"…\" nor scientific", () => {
    const ticks = valueAxisTicks([1_450_000], 4);
    const texts = ticks.map(long);
    for (const text of texts) {
      const free = tickText(text, 120, "en", texts, formattedValues(ticks, long), false).lines;
      const held = tickText(text, 120, "en", texts, formattedValues(ticks, long), false, 2).lines;
      expect(free.length, free.join(" | ")).toBeGreaterThan(2);
      expect(held.length, held.join(" | ")).toBeLessThanOrEqual(2);
      // Every word kept, the phrase before the figure and the qualifiers after it.
      expect(held.join(" ").replace(/\s+/gu, " ")).toMatch(/^Total sales revenue € .+ net this month overall$/u);
      expect(held.join(" ")).not.toMatch(/…|\dE\d/u);
    }
    // One line where even two would not do; beside the plot (clipping) no cap applies.
    expect(tickText(long(1_450_000), 20, "en", [], undefined, false, 1).lines).toHaveLength(1);
  });

  it("the band's lines, in any face: one of any script in Recharts' 30px; two of Latin from 31px, of Arabic from 36px", () => {
    // The last line's box: its baseline (8 + 0.71em, then 1em a line) and the most any face's descent reaches,
    // rounded up to a pixel: 0.3em of Latin, Cyrillic, Hebrew or Han (4px at 11px), 0.74em with an Arabic letter (9px).
    expect(bandLines("€ 1,450,000 net", 30)).toBe(1);
    expect(bandLines("12 млн km / hr", 30)).toBe(1);
    expect(bandLines("€ 1,450,000 net", 31)).toBe(2);
    expect(bandLines("إجمالي ‏١٫٥ مليون €", 30)).toBe(1);
    expect(bandLines("إجمالي ‏١٫٥ مليون €", 35)).toBe(1);
    expect(bandLines("إجمالي ‏١٫٥ مليون €", 36)).toBe(2);
    expect(bandLines("€ 1,450,000", 20)).toBe(1);
    expect(bandLines("€ 1,450,000", 52)).toBe(3);
    expect(bandLines("€ 1,450,000", 53)).toBe(4);
    // Any other script, by the deepest face measured (1.05em: 12px at 11px).
    expect(bandLines("१५० खरब", 38)).toBe(1);
    expect(bandLines("१५० खरब", 39)).toBe(2);
    // At the tick's own font size.
    expect(bandLines("€ 1,450,000 net", 32, 12)).toBe(1);
    expect(bandLines("€ 1,450,000 net", 33, 12)).toBe(2);
  });

  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar"]] as const) {
    it(`${dir}: a horizontal BarChart's and a ScatterChart's x ticks stay within their 30px band`, () => {
      frameWidth = 320;
      inLocale(<BarChart title="band" data={[{ region: "North", a: 1_450_000 }, { region: "South", a: 600_000 }]} index="region" categories={["a"]} layout="horizontal" valueFormatter={long} />, locale);
      const ticks = [...document.querySelectorAll(".recharts-xAxis-tick-labels text")];
      expect(ticks.length).toBeGreaterThan(0);
      // One line in Recharts' 30px band, in any face (two were drawn with 0.19px to spare).
      for (const tick of ticks) {
        expect(tick.querySelectorAll("tspan").length, tick.textContent ?? "").toBe(1);
        expect(tick.textContent).not.toContain("…");
      }
      cleanup();
      inLocale(<ScatterChart title="band" data={[{ product: "A", price: 1_200_000, revenue: 41_000 }, { product: "B", price: 900_000, revenue: 27_000 }]} name="product" x="price" y="revenue" xLabel="Price" yLabel="Revenue" valueFormatters={{ x: long, y: String }} />, locale);
      for (const tick of document.querySelectorAll(".recharts-xAxis-tick-labels text")) expect(tick.querySelectorAll("tspan").length).toBe(1);
    });
  }
});

describe("Q2: every tick and label line in its own isolated direction, where it was anchored", () => {
  /** Each line: its text, its own direction, unicode-bidi, its own text-anchor or the text's. */
  const linesOf = (selector: string) =>
    [...document.querySelectorAll<SVGTextElement>(selector)].flatMap((text) =>
      [...text.querySelectorAll("tspan")].map((span) => ({
        text: span.textContent ?? "",
        direction: span.getAttribute("direction"),
        bidi: span.getAttribute("unicode-bidi"),
        anchor: span.getAttribute("text-anchor") ?? text.getAttribute("text-anchor"),
        own: span.hasAttribute("text-anchor"),
        textAnchor: text.getAttribute("text-anchor"),
        clipped: text.hasAttribute("clip-path"),
      })),
    );

  it("lineDirection reads a line's own direction; anchorFor keeps it where the plot anchors it", () => {
    expect(lineDirection("\u200f١٥٠\u00a0ترليون\u00a0€")).toBe("rtl");
    expect(lineDirection("١٥٠ ترليون")).toBe("rtl");
    expect(lineDirection("\u200f1.5E14 €")).toBe("rtl");
    // The first strong character decides: a Latin figure before an Arabic word does not.
    expect(lineDirection("€ 1.5 ترليون")).toBe("rtl");
    expect(lineDirection("150 ترليون")).toBe("rtl");
    expect(lineDirection("€ 1,450,000")).toBe("ltr");
    expect(lineDirection("12 млн km / hr")).toBe("ltr");
    expect(readsRightToLeft("\u061c-١٫٥ مليون")).toBe(true);
    expect(readsRightToLeft("\u200e-1.5 مليون")).toBe(false);
    expect([anchorFor("end", "rtl"), anchorFor("start", "rtl"), anchorFor("middle", "rtl")]).toEqual(["start", "end", "middle"]);
    expect([anchorFor("end", "ltr"), anchorFor("start", "ltr"), anchorFor("middle", "ltr"), anchorFor(undefined, "ltr")]).toEqual(["end", "start", "middle", "start"]);
  });

  for (const [anchor, x] of [["end", 120], ["start", 300], ["middle", 200]] as const) {
    it(`a value tick (text-anchor ${anchor}) that fits: each line isolated in its direction, anchored as before`, () => {
      for (const [locale, format] of [["ar-EG", arEgEuro], ["ar", arEuro], ["en", enEuro], ["ar", (value: number) => `€ ${value.toLocaleString("en-US")} net this month`], ["he-IL", intl("he-IL", { style: "currency", currency: "ILS" })]] as const) {
        render(
          <DesignSystemProvider locale={locale} navigate={vi.fn()}>
            <svg>
              <ValueTick x={x} y={50} width={anchor === "middle" ? 400 : 200} textAnchor={anchor} payload={{ value: 1_450_000 }} tickFormatter={format as never} />
            </svg>
          </DesignSystemProvider>,
        );
        const lines = linesOf("[data-slot='chart-value-tick']");
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line.clipped).toBe(false);
          expect(line.textAnchor).toBe(anchor);
          expect(line.direction, line.text).toBe(lineDirection(line.text));
          expect(line.bidi).toBe("isolate");
          expect(line.anchor, line.text).toBe(anchorFor(anchor, lineDirection(line.text)));
          // A line read from the left keeps the text's anchor: drawn exactly as before.
          if (line.direction === "ltr") expect(line.own).toBe(false);
        }
        cleanup();
      }
    });
  }

  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar-EG"]] as const) {
    it(`${dir}: bar-end labels, category ticks and names: each line in its own direction, anchored where it was`, () => {
      frameWidth = 640;
      const names = [{ region: "فرع القاهرة 2", a: 1_450_000 }, { region: "North", a: -350_000 }, { region: "סניף תל אביב", a: 900_000 }];
      inLocale(<BarChart title="q2" data={names} index="region" categories={["a"]} layout="horizontal" sortBy="none" valueFormatter={arEgEuro} />, locale);
      const labels = linesOf(".recharts-label-list text");
      expect(labels.length).toBe(3);
      for (const line of labels) {
        expect(line.direction, line.text).toBe(lineDirection(line.text));
        expect(line.bidi).toBe("isolate");
        expect(line.anchor).toBe(anchorFor(line.textAnchor as "start" | "end", line.direction as "ltr" | "rtl"));
      }
      // Recharts' names, each its own isolated paragraph in its direction, anchored as Recharts anchors it.
      const nameTexts = [...document.querySelectorAll<SVGTextElement>(".recharts-yAxis-tick-labels text")];
      expect(nameTexts.map((text) => text.textContent)).toEqual(names.map((row) => row.region));
      for (const text of nameTexts) {
        const direction = lineDirection(text.textContent ?? "");
        expect(text.getAttribute("direction")).toBe(direction);
        expect(text.getAttribute("unicode-bidi")).toBe("isolate");
        expect(text.getAttribute("text-anchor")).toBe(anchorFor(dir === "ltr" ? "end" : "start", direction));
        expect(text.classList.contains("recharts-cartesian-axis-tick-value")).toBe(true);
      }
      cleanup();
      inLocale(<LineChart title="q2" data={[{ month: "يونيو", a: 1 }, { month: "Jul", a: 2 }]} index="month" categories={["a"]} valueFormatter={arEgEuro} />, locale);
      for (const line of linesOf(".recharts-xAxis-tick-labels text")) {
        expect(line.direction, line.text).toBe(lineDirection(line.text));
        expect(line.bidi).toBe("isolate");
        expect(line.anchor).toBe("middle");
      }
    });
  }

  it("a category tick and a name render alone as the chart renders them", () => {
    render(
      <svg>
        <CategoryTick x={100} y={20} payload={{ value: "يونيو" }} />
        <NameTick x={100} y={60} textAnchor="end" width={80} payload={{ value: "فرع القاهرة" }} />
        <NameTick polar x={100} y={90} textAnchor="start" payload={{ value: "Speed" }} />
      </svg>,
    );
    const [category, name, polar] = [...document.querySelectorAll("text")];
    expect(category!.querySelector("tspan")!.getAttribute("direction")).toBe("rtl");
    expect(name!.getAttribute("direction")).toBe("rtl");
    expect(name!.getAttribute("text-anchor")).toBe("start");
    expect(polar!.getAttribute("direction")).toBe("ltr");
    expect(polar!.getAttribute("text-anchor")).toBe("start");
    expect(polar!.classList.contains("recharts-polar-angle-axis-tick-value")).toBe(true);
  });
});

describe("Q2: axis names, reference-line labels, Waterfall labels and the HTML texts", () => {
  it("isolatedLabel keeps a label where Recharts puts it at its position, in its own direction", () => {
    expect(isolatedLabel("Price", "insideBottom")).toEqual({ direction: "ltr", unicodeBidi: "isolate", textAnchor: "middle" });
    expect(isolatedLabel("السعر (€)", "insideLeft")).toEqual({ direction: "rtl", unicodeBidi: "isolate", textAnchor: "end" });
    expect(isolatedLabel("الهدف 2026", "insideBottomRight")).toEqual({ direction: "rtl", unicodeBidi: "isolate", textAnchor: "start" });
    expect(isolatedLabel("Target", "insideBottomLeft")).toEqual({ direction: "ltr", unicodeBidi: "isolate", textAnchor: "start" });
    expect(isolatedLabel(undefined, "top").direction).toBe("ltr");
  });

  for (const [dir, locale] of [["ltr", "en"], ["rtl", "ar-EG"]] as const) {
    it(`${dir}: a ScatterChart's axis names and a reference line's label carry their own direction`, () => {
      inLocale(<ScatterChart title="s" data={[{ product: "A", price: 1_200, revenue: 41 }, { product: "B", price: 900, revenue: 27 }]} name="product" x="price" y="revenue" xLabel="السعر (€)" yLabel="Revenue (€)" />, locale);
      const names = [...document.querySelectorAll<SVGTextElement>(".recharts-label")];
      expect(names.map((name) => name.textContent)).toEqual(["السعر (€)", "Revenue (€)"]);
      expect(names.map((name) => name.getAttribute("direction"))).toEqual(["rtl", "ltr"]);
      for (const name of names) expect(name.getAttribute("unicode-bidi")).toBe("isolate");
      expect(names[0]!.getAttribute("text-anchor")).toBe("middle");
      expect(names[1]!.getAttribute("text-anchor")).toBe(dir === "ltr" ? "start" : "end");
      cleanup();
      inLocale(<LineChart title="r" data={[{ month: "Jun", a: 10 }, { month: "Jul", a: 20 }]} index="month" categories={["a"]} referenceLines={[{ value: 15, label: "الهدف 2026" }]} />, locale);
      const label = [...document.querySelectorAll<SVGTextElement>(".recharts-label")].find((text) => text.textContent === "الهدف 2026")!;
      expect(label).toBeDefined();
      expect(label.getAttribute("direction")).toBe("rtl");
      // insideBottomRight ("end") in LTR, insideBottomLeft ("start") in RTL, flipped for a label read from the right.
      expect(label.getAttribute("text-anchor")).toBe(dir === "ltr" ? "start" : "end");
    });
  }

  it("a Waterfall step's label is its own isolated line, centred over its bar", () => {
    frameWidth = 900;
    inLocale(<WaterfallChart title="w" steps={[{ name: "Sales", value: 48_200 }, { name: "Shipping", value: -6_700 }]} endLabel="Net" valueFormatter={intl("ar-EG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} />, "ar-EG");
    const spans = [...document.querySelectorAll("[data-slot='waterfall-label'] tspan")];
    expect(spans.length).toBeGreaterThan(0);
    for (const span of spans) {
      expect(span.getAttribute("direction")).toBe("rtl");
      expect(span.getAttribute("unicode-bidi")).toBe("isolate");
      expect(span.getAttribute("text-anchor")).toBeNull();
      expect(span.closest("text")!.getAttribute("text-anchor")).toBe("middle");
    }
  });
});

describe("one notation per axis at the chart's edge, ticks on their gridlines", () => {
  it("N1: under the plot, the chart's edge is decided once for the axis: no axis mixes compact and scientific ticks", () => {
    const SCIENTIFIC = /\dE\d/u;
    let checked = 0;
    let scientificAxes = 0;
    for (const max of [1.5e29, 9e28, 2.2e29, 1.5e27, 4.4e30]) {
      for (const count of [4, 5]) {
        const ticks = valueAxisTicks([max], count);
        const texts = ticks.map(enEuro);
        const values = formattedValues(ticks, enEuro);
        for (let edge = 100; edge <= 400; edge += 4) {
          for (const maxLines of [1, 2]) {
            const shown = texts.map((text) => tickText(text, 60, "en", texts, values, false, maxLines, edge).lines.join(" "));
            // Zero is written alike either way ("€0.00").
            const kinds = new Set(shown.filter((_, at) => ticks[at] !== 0).map((tick) => SCIENTIFIC.test(tick)));
            expect(kinds.size, `${max} ${count} ${edge}: ${shown.join(" | ")}`).toBe(1);
            if (kinds.has(true)) scientificAxes += 1;
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    // These axes (en €, max 1.5e29, 9e28, 2.2e29) reach the scientific step at narrow charts, whole.
    expect(scientificAxes).toBeGreaterThan(100);
    // Never a mix such as ["€0.00","€40,000,000,000,000,000T","€80,000,000,000,000,000T","€1.2E29","€1.6E29"].
    const ticks = valueAxisTicks([1.5e29], 5);
    const texts = ticks.map(enEuro);
    for (const edge of [180, 200, 220, 240]) {
      const shown = texts.map((text) => tickText(text, 60, "en", texts, formattedValues(ticks, enEuro), false, 2, edge).lines.join(" "));
      expect(shown.slice(1).every((tick) => SCIENTIFIC.test(tick)) || shown.every((tick) => !SCIENTIFIC.test(tick)), shown.join(" | ")).toBe(true);
    }
  }, 60_000);

  it("N2: a tick under the plot stays on its gridline; only one whose estimate could pass the chart's edge gets the CSS that moves it by its drawn width", () => {
    // Inside the edges by the estimate (an upper bound): nothing set, drawn exactly as Recharts drew it.
    expect(edgeShift(["€ 1,450,000"], 160, 320)).toBeUndefined();
    // Near an edge: a translation the browser resolves against the text's own box, 0 where it fits.
    expect(edgeShift(["€ 1,450,000"], 10, 320)).toEqual({ transformBox: "fill-box", transform: "translateX(clamp(calc(50% + 0.075em - 10px), 0px, calc(310px - 0.075em - 50%)))" });
    expect(edgeShift(["€ 1,450,000", "net"], 315.5, 320)).toEqual({ transformBox: "fill-box", transform: "translateX(clamp(calc(50% + 0.075em - 315.5px), 0px, calc(4.5px - 0.075em - 50%)))" });
    // In a chart: every tick under horizontal bars at its gridline's x, whatever its width.
    const phrase = (value: number) => `Total sales revenue ${enEuro(value)} net this month overall`;
    for (const [locale, format, wide] of [["en", enEuro, false], ["ar-EG", arEgEuro, false], ["en", phrase, true], ["ar", phrase, true]] as const) {
      frameWidth = 320;
      inLocale(<BarChart title="n2" data={[{ region: "North", a: 1_450_000 }, { region: "South", a: 900_000 }]} index="region" categories={["a"]} layout="horizontal" valueFormatter={format} />, locale);
      const grid = new Set([...document.querySelectorAll(".recharts-cartesian-grid-vertical line")].map((line) => Number(line.getAttribute("x1"))));
      const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-xAxis-tick-labels text")];
      expect(ticks.length).toBeGreaterThan(1);
      let shifted = 0;
      for (const tick of ticks) {
        const x = Number(tick.getAttribute("x"));
        expect(grid.has(x), `${tick.textContent} at ${x}, grid ${[...grid].join(",")}`).toBe(true);
        for (const span of tick.querySelectorAll("tspan")) expect(Number(span.getAttribute("x"))).toBe(x);
        const style = tick.getAttribute("style") ?? "";
        if (style.includes("translateX")) {
          shifted += 1;
          expect(style).toContain("transform-box: fill-box");
        }
      }
      // The first tick (at the plot's start, near the chart's edge) is the one that may need it.
      // A tick wide enough to pass an edge by the estimate gets the style; the others are drawn as Recharts drew them.
      if (wide) expect(shifted, locale).toBeGreaterThan(0);
      cleanup();
    }
  }, 60_000);
});
