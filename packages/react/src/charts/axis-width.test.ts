import { describe, expect, it } from "vitest";

import { AXIS_MAX, TICK_INSET, chartNumber, textWidth, tickAxisWidth, tickWrapWidth, valueAxisTicks, valueAxisWidth } from "./axis-width";

const euro = (value: number) => `€ ${value.toLocaleString("tr-TR")}`;
const percent = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 0 });

describe("value axis width from its ticks", () => {
  it("uses Recharts' own nice ticks for a [0, auto] axis, zero always in it", () => {
    expect(valueAxisTicks([900_000, 1_450_000, 1_100_000], 4)).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(valueAxisTicks([41_000, 58_000, 17_000], 4)).toEqual([0, 20_000, 40_000, 60_000]);
    expect(valueAxisTicks([-1_200_000, 800_000], 4)).toEqual([-1_600_000, -800_000, 0, 800_000]);
    // Gaps (null, missing, NaN) are not drawn, so they do not count; a numeric string ("12") is drawn at its
    // number and counts, here below the largest value.
    expect(valueAxisTicks([null, undefined, Number.NaN, "12", 58_000], 4)).toEqual([0, 20_000, 40_000, 60_000]);
  });

  it("short figures keep the floor: the 48px value axes always had", () => {
    expect(valueAxisWidth([54, 61], euro, { tickCount: 4, min: 48 })).toBe(48);
    expect(valueAxisWidth([120, 140], String, { tickCount: 4, min: 48 })).toBe(48);
    expect(valueAxisWidth([], euro, { tickCount: 4, min: 48 })).toBe(48);
  });

  it("long figures: the longest tick's estimated width plus the 8px Recharts draws ticks in from the plot", () => {
    // "€ 60.000" measures 48px at 11px in Geist, as wide as the old fixed axis, so it wrapped; its estimate is 50px.
    expect(valueAxisWidth([41_000, 58_000], euro, { tickCount: 4, min: 48 })).toBe(textWidth("€ 60.000", "tabular") + TICK_INSET);
    expect(valueAxisWidth([41_000, 58_000], euro, { tickCount: 4, min: 48 })).toBe(58);
    // "€ 1.500.000": 64px in Geist, 68px estimated (Geist's next/font fallback draws "." and the space 3.5px).
    expect(valueAxisWidth([1_450_000], euro, { tickCount: 4, min: 48 })).toBe(76);
  });

  it("a negative tick counts with its sign", () => {
    // "€ -1.600.000": 73px estimated, the hyphen-minus 5px.
    expect(valueAxisWidth([-1_200_000, 800_000], euro, { tickCount: 4, min: 48 })).toBe(81);
  });

  it("percent and compact figures are sized from what they print", () => {
    expect(tickAxisWidth([percent.format(0), percent.format(1)], 48)).toBe(48);
    // A compact format: the longest tick is "€ 1,5 Mn" (50px), not the rounded-up end the axis never draws
    // ("€ 2 Mn", 42px), which is why the width comes from Recharts' ticks rather than from the data's ends.
    const short = (value: number) => (value >= 1_000_000 ? `€ ${(value / 1_000_000).toLocaleString("tr-TR")} Mn` : `€ ${value / 1000} B`);
    expect(valueAxisTicks([1_450_000], 4).map(short)).toEqual(["€ 0 B", "€ 500 B", "€ 1 Mn", "€ 1,5 Mn"]);
    expect(valueAxisWidth([1_450_000], short, { tickCount: 4, min: 48 })).toBe(58);
  });

  it("never past 128px; room beside the ticks (an axis name) counts within it", () => {
    expect(tickAxisWidth(["€ 1.000.000.000.000.000"], 48)).toBe(AXIS_MAX);
    expect(tickAxisWidth(["€ 60.000"], 56, 16)).toBe(74);
    expect(tickAxisWidth(["€ 0"], 56, 16)).toBe(56);
    expect(tickAxisWidth(["€ 1.000.000.000.000"], 56, 16)).toBe(AXIS_MAX);
  });

  it("margin rule: a tick as wide as its estimate is still strictly narrower than the axis", () => {
    // Recharts keeps a tick on one line only while it measures narrower than the axis (strict <).
    for (const tick of ["€ 20.000", "€ 1.500.000", "€ -1.600.000", "1500000", "%100", "€1,5 Mn", "124 orders"]) {
      const estimate = textWidth(tick, "tabular");
      const width = tickAxisWidth([tick], 48);
      expect(estimate).toBeLessThan(width);
      // And it is drawn whole: it ends 8px in from the plot and starts inside the axis.
      if (width < AXIS_MAX) expect(estimate + TICK_INSET).toBeLessThanOrEqual(width);
    }
  });
});

describe("values and ticks as Recharts draws them", () => {
  it("numeric strings count as Recharts plots them (its makeNumber); gaps and other strings do not", () => {
    expect(chartNumber("1500000")).toBe(1_500_000);
    expect(chartNumber(" -42.5 ")).toBe(-42.5);
    expect(chartNumber(new Date(86_400_000))).toBe(86_400_000);
    // A Number object too, as Recharts' isNumber takes it (`instanceof Number`).
    expect(chartNumber(new Number(1_500_000))).toBe(1_500_000);
    for (const gap of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, "abc", "1.500.000", {}, true, new Number(Number.NaN), [5]]) expect(chartNumber(gap)).toBeUndefined();
    // An axis over numeric strings spans them: "€ 1.500.000" gets its 76px, not the 48px floor it wrapped in.
    expect(valueAxisTicks(["900000", "1450000"], 4)).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(valueAxisWidth(["900000", "1450000"], euro, { tickCount: 4, min: 48 })).toBe(76);
  });

  it("format and bidi marks take no room: ar-EG figures count their drawn characters only", () => {
    const egp = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EUR" }).format(48_920);
    expect(egp).toContain("\u200f");
    expect(textWidth(egp)).toBe(textWidth(egp.replace(/\u200f/g, "")));
    expect(textWidth("\u200e\u061c12\u200f")).toBe(textWidth("12"));
    expect(tickAxisWidth([egp], 48)).toBe(textWidth(egp, "tabular") + TICK_INSET);
  });

  it("each tick is given the room between the axis' outer edge and where it is drawn, exactly at the clamp too", () => {
    expect(tickWrapWidth(85)).toBe(77);
    expect(tickWrapWidth(AXIS_MAX)).toBe(AXIS_MAX - TICK_INSET);
    // Beside an axis name, its room too; never negative.
    expect(tickWrapWidth(80, 16)).toBe(56);
    expect(tickWrapWidth(4)).toBe(0);
    // Below the clamp the longest tick's estimate is exactly that room, so it never wraps (Recharts wraps at >=).
    for (const tick of ["€ 20.000", "€ 1.500.000", "124 orders", "€ 1.000.000.000"]) {
      const width = tickAxisWidth([tick], 48);
      expect(width).toBeLessThan(AXIS_MAX);
      expect(textWidth(tick, "tabular")).toBeLessThanOrEqual(tickWrapWidth(width));
    }
    // At the clamp a longer tick's estimate passes its room, so Recharts wraps it at a space rather than letting it
    // cross the axis' outer edge into the margin.
    const long = "€ 1.000.000.000.000.000";
    expect(tickAxisWidth([long], 48)).toBe(AXIS_MAX);
    expect(textWidth(long, "tabular")).toBeGreaterThan(tickWrapWidth(AXIS_MAX));
  });
});

describe("a text's width from its characters", () => {
  // Measured in Chromium at 11px (Geist hinted and at its true advance, its next/font fallback, Arial as Liberation
  // Sans, system-ui, Noto Sans, DejaVu Sans): each character at its widest, so the estimate is never under the drawn
  // text, and much closer than 7px a character.
  it("per character: figures, separators, spaces, signs, letters", () => {
    expect(textWidth("")).toBe(0);
    // Tabular figures (ticks) are 7px; proportional ones (labels) by figure, "0" the widest (7.29px).
    expect(textWidth("1111", "tabular")).toBe(28);
    expect(textWidth("1111")).toBe(28);
    expect(textWidth("0000")).toBe(30);
    // "." and "," are 3.5px, the space 3.5px, "€" 8px, "%" 11px, against 7px each before.
    expect(textWidth("€ 1.500.000", "tabular")).toBe(68);
    expect(textWidth("%100", "tabular")).toBe(32);
    expect(textWidth("€ 12.000.000 net")).toBe(99);
    // Letters by their width: "i" 3.07px, "m" 10.72px.
    expect(textWidth("iiii")).toBe(13);
    expect(textWidth("mmmm")).toBe(43);
  });

  it("marks take no room; accents decompose to their letter; other scripts by class", () => {
    expect(textWidth("\u200f\u061c\u200e12")).toBe(textWidth("12"));
    expect(textWidth("şğüöç")).toBe(textWidth("sguoc"));
    // Turkish dotless ı (no letter to decompose to) is narrow, as an "i" is.
    expect(textWidth("ııı")).toBe(10);
    expect(textWidth("ııı")).toBeLessThan(textWidth("aaa"));
    // Arabic-Indic figures no wider than Latin ones; a no-break space as a space.
    expect(textWidth("١٢٣")).toBeLessThanOrEqual(textWidth("123", "tabular"));
    expect(textWidth("1\u00a0000")).toBe(textWidth("1 000"));
    // Cyrillic, Greek and Arabic letters are counted, never zero.
    for (const word of ["млн", "εκ.", "مليون"]) expect(textWidth(word)).toBeGreaterThan(Array.from(word).length * 3);
  });

  it("deterministic: the same on every call, with no measurement", () => {
    const text = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "EUR" }).format(1_450_000.5);
    expect(textWidth(text)).toBe(textWidth(text));
    expect(Number.isInteger(textWidth(text))).toBe(true);
  });
});
