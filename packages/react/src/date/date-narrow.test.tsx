import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DateField, DatePicker, TimeField } from "./index";
import { DateRangePicker } from "./pickers";
import { isDateTimeBreak } from "./segments";

/**
 * Date and time fields at narrow widths. The segments never wrap, except after the separator between a date and its
 * time, so a range with hours in a phone column puts each half's time under its date instead of pushing the page
 * sideways (in ar it could not shrink below ~383px). jsdom has no layout: these check the structure the browser wraps
 * on.
 */

afterEach(cleanup);

const LOCALES = ["ar", "ru", "el", "en"] as const;
const DIRS = ["ltr", "rtl"] as const;
const BREAK = "whitespace-pre-wrap";

function inLocale(ui: React.ReactElement, locale: string, dir: "ltr" | "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const segmentsOf = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>("[data-slot='date-segment']"));
const breaksOf = (root: ParentNode) => segmentsOf(root).filter((segment) => segment.className.split(/\s+/).includes(BREAK));
/** The nearest non-literal segment's type on one side of a segment, in DOM (the locale's) order. */
function neighbour(segment: HTMLElement, step: 1 | -1) {
  const all = segmentsOf(segment.closest("[data-slot='date-input']")!);
  for (let at = all.indexOf(segment) + step; at >= 0 && at < all.length; at += step) {
    const type = all[at]!.getAttribute("data-type");
    if (type !== "literal") return type;
  }
  return null;
}

const RANGE_HOURS = { start: new CalendarDateTime(2026, 10, 14, 10, 0), end: new CalendarDateTime(2026, 10, 18, 10, 30) };

describe("isDateTimeBreak", () => {
  // A literal's text is a space unless given (", " in en, "، " in ar); the bidi isolate before a time is one too.
  type Part = Parameters<typeof isDateTimeBreak>[0][number];
  const seg = (type: string): Part =>
    (type === "isolate" ? { type: "literal", text: "\u2066" } : { type, text: type === "literal" ? " " : "10" }) as Part;
  it("is the literal between a date and its time, in either order", () => {
    const dateTime = ["day", "literal", "month", "literal", "year", "literal", "hour", "literal", "minute"].map(seg);
    expect(dateTime.map((_, index) => isDateTimeBreak(dateTime, index))).toEqual([false, false, false, false, false, true, false, false, false]);
    const timeFirst = ["hour", "literal", "minute", "literal", "dayPeriod", "literal", "day", "literal", "month"].map(seg);
    expect(timeFirst.map((_, index) => isDateTimeBreak(timeFirst, index))).toEqual([false, false, false, false, false, true, false, false, false]);
  });

  it("is never inside a date, inside a time, or beside the AM/PM", () => {
    const date = ["month", "literal", "day", "literal", "year"].map(seg);
    const time = ["hour", "literal", "minute", "literal", "dayPeriod"].map(seg);
    expect(date.some((_, index) => isDateTimeBreak(date, index))).toBe(false);
    expect(time.some((_, index) => isDateTimeBreak(time, index))).toBe(false);
    // A segment that is not a literal is never the break, even at the seam.
    expect(isDateTimeBreak(["year", "hour"].map(seg), 0)).toBe(false);
  });

  it("is the separator with a space, not the bidi isolate beside it, and never a no-break space", () => {
    const isolated = ["year", "literal", "isolate", "hour"].map(seg);
    expect(isolated.map((_, index) => isDateTimeBreak(isolated, index))).toEqual([false, true, false, false]);
    const noBreak = [{ type: "year", text: "2026" }, { type: "literal", text: "\u00a0" }, { type: "hour", text: "10" }] as Part[];
    expect(isDateTimeBreak(noBreak, 1)).toBe(false);
  });
});

// Real locales whose order the synthetic cases above stand in for: vi puts the time first, ko puts the AM/PM before
// the hour after the date. The break stays the one literal at the seam, whichever side the date is on.
describe.each(["vi", "ko"] as const)("%s, a locale with another date-time order", (locale) => {
  it.each(DIRS)("DateRangePicker with hours breaks each half once, at the date-time seam (%s)", (dir) => {
    const { container } = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE_HOURS} />, locale, dir);
    for (const half of ["start", "end"]) {
      const input = container.querySelector(`[data-slot='date-range-${half}'] [data-slot='date-input']`)!;
      const breaks = breaksOf(input);
      expect(breaks, `${half} half`).toHaveLength(1);
      const [mark] = breaks as [HTMLElement];
      expect(/\s/.test(mark.textContent ?? ""), `"${mark.textContent}"`).toBe(true);
      const sides = [neighbour(mark, -1), neighbour(mark, 1)];
      const isDate = (type: string | null) => ["day", "month", "year"].includes(type ?? "");
      const isTime = (type: string | null) => ["hour", "minute", "dayPeriod"].includes(type ?? "");
      expect((isDate(sides[0]) && isTime(sides[1])) || (isTime(sides[0]) && isDate(sides[1])), sides.join(" | ")).toBe(true);
    }
  });

  it("vi puts the time first and ko the AM/PM before the hour, as the synthetic cases assume", () => {
    const { container } = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE_HOURS} />, locale, "ltr");
    const types = segmentsOf(container.querySelector("[data-slot='date-range-start']")!)
      .map((segment) => segment.getAttribute("data-type"))
      .filter((type) => type !== "literal");
    if (locale === "vi") expect(types[0]).toBe("hour");
    else expect(types.slice(types.indexOf("day") + 1, types.indexOf("day") + 3)).toEqual(["dayPeriod", "hour"]);
  });
});

describe.each(LOCALES)("%s", (locale) => {
  describe.each(DIRS)("%s", (dir) => {
    it("DateRangePicker with hours: each half may break once, between its date and its time", () => {
      const { container } = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE_HOURS} />, locale, dir);
      for (const half of ["start", "end"]) {
        const input = container.querySelector(`[data-slot='date-range-${half}'] [data-slot='date-input']`)!;
        // The segments themselves still never wrap: only the one separator's space does.
        expect(input.className.split(/\s+/)).toContain("whitespace-nowrap");
        const breaks = breaksOf(input);
        expect(breaks, `${half} half`).toHaveLength(1);
        const [mark] = breaks as [HTMLElement];
        expect(mark.getAttribute("data-type")).toBe("literal");
        // A space to break at, and the date's parts on one side, the time's on the other.
        expect(/\s/.test(mark.textContent ?? ""), `"${mark.textContent}"`).toBe(true);
        expect(["day", "month", "year"]).toContain(neighbour(mark, -1));
        expect(["hour", "minute", "dayPeriod"]).toContain(neighbour(mark, 1));
        expect(mark.className).not.toMatch(/(^|\s)whitespace-pre(\s|$)/);
      }
    });

    it("the segment order is the locale's, whatever the page direction", () => {
      const ltr = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE_HOURS} />, locale, "ltr");
      const order = segmentsOf(ltr.container).map((segment) => segment.getAttribute("data-type"));
      cleanup();
      const other = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE_HOURS} />, locale, dir);
      expect(segmentsOf(other.container).map((segment) => segment.getAttribute("data-type"))).toEqual(order);
    });

    it("a date alone and a time alone never break: DateField, DatePicker, a range of days, TimeField", () => {
      const { container } = inLocale(
        <>
          <DateField label="Expiry date" defaultValue={new CalendarDate(2026, 10, 14)} />
          <DateField label="Billing month" granularity="month" defaultValue={new CalendarDate(2026, 10, 1)} />
          <DateField label="Season start" hideYear defaultValue={new CalendarDate(2000, 6, 1)} />
          <DatePicker label="Due date" defaultValue={new CalendarDate(2026, 10, 14)} />
          <DatePicker label="Month" granularity="month" defaultValue={new CalendarDate(2026, 10, 1)} />
          <DateRangePicker label="Trip dates" defaultValue={{ start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) }} />
          <TimeField label="Time" defaultValue={new Time(10, 30)} />
          <TimeField label="Time (12-hour)" hourCycle={12} defaultValue={new Time(10, 30)} />
          <TimeField label="Time (empty)" />
        </>,
        locale,
        dir,
      );
      expect(segmentsOf(container).length).toBeGreaterThan(20);
      expect(breaksOf(container)).toEqual([]);
      for (const input of container.querySelectorAll("[data-slot='date-input']")) {
        expect(input.className.split(/\s+/)).toContain("whitespace-nowrap");
      }
    });

    it("an empty range with hours breaks at the same place (placeholders)", () => {
      const { container } = inLocale(<DateRangePicker label="Trip dates" granularity="hour" />, locale, dir);
      const breaks = breaksOf(container);
      expect(breaks).toHaveLength(2);
      for (const mark of breaks) {
        expect(["day", "month", "year"]).toContain(neighbour(mark, -1));
        expect(["hour", "minute", "dayPeriod"]).toContain(neighbour(mark, 1));
      }
    });
  });
});
