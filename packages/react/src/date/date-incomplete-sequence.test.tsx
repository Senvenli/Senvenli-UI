import * as React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimeValue } from "react-aria-components";

import { DesignSystemProvider } from "../provider";
import { DateField, DatePicker, DateRangePicker, TimeField, type DateRangePickerValue } from "./index";

/**
 * The value a field reports matches its parts on screen, once per change. A part typed to complete a
 * value typed in part used to be reported three times (10:30, minutes cleared, "4" typed: 10:04, null, 10:04): React Aria
 * reported the time, then the field reported null on the parts of the render before. And a first "0" (a month or a day
 * "00", a year or a 12-hour clock's hour "0") is no value: it used to count as filled and report the old date again, or
 * the 1st on blur.
 */

afterEach(cleanup);

// Backspace takes a segment's digits one at a time, as in a browser: "30" goes to "3" (a time, reported) and then to
// its placeholder. Each step is a change on screen, so each is in the sequences below.

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "en-GB") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function segment(root: ParentNode, kind: string, nth = 0) {
  return root.querySelectorAll<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`)[nth]!;
}
function shown(root: ParentNode) {
  return Array.from(root.querySelectorAll("[data-slot='date-segment']"))
    .map((s) => (s.textContent ?? "").replace(/[⁦-⁩]/g, ""))
    .filter((text) => text !== "");
}
function type(el: HTMLElement, text: string) {
  act(() => el.focus());
  for (const data of text) {
    act(() => {
      (document.activeElement ?? el).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
    });
  }
}
function clear(el: HTMLElement) {
  act(() => el.focus());
  for (let i = 0; i < 5 && !el.hasAttribute("data-placeholder"); i++) {
    act(() => {
      el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
    });
  }
}
function blur() {
  act(() => (document.activeElement as HTMLElement | null)?.blur());
}
const invalid = (root: ParentNode) => root.querySelector("[data-slot='input-group']")?.hasAttribute("data-invalid") ?? false;

/** Each reported value as text: "2026-01-24", "10:04:00", "2026-10-14T10:04:00–2026-10-18T10:00:00", or null. */
function text(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object" && "start" in value && "end" in value) {
    const range = value as DateRangePickerValue;
    return `${range.start.toString()}–${range.end.toString()}`;
  }
  return String(value);
}

type Mode = "controlled" | "uncontrolled";
const MODES: Mode[] = ["controlled", "uncontrolled"];

/** Renders a field controlled (the app keeps what it hears) or not, and records every value it reports. */
function mount<T>(
  mode: Mode,
  initial: T,
  field: (props: { value?: T | null; defaultValue?: T | null; onChange: (next: T | null) => void }) => React.ReactElement,
  locale?: string,
) {
  const seen: (string | null)[] = [];
  function Controlled() {
    const [value, setValue] = React.useState<T | null>(initial);
    return field({ value, onChange: (next) => { seen.push(text(next)); setValue(next); } });
  }
  const ui = mode === "controlled" ? <Controlled /> : field({ defaultValue: initial, onChange: (next) => seen.push(text(next)) });
  const { container } = inLocale(ui, locale);
  return { container, seen };
}

describe.each(MODES)("the exact values reported, %s", (mode) => {
  it("TimeField: 10:30, minutes cleared, 4 typed, then 5: 10:03, null, 10:04, 10:45", () => {
    const { container, seen } = mount<TimeValue>(mode, new Time(10, 30), (props) => <TimeField label="Meeting time" {...props} />);
    clear(segment(container, "minute"));
    expect(seen).toEqual(["10:03:00", null]);
    type(segment(container, "minute"), "4");
    expect(seen).toEqual(["10:03:00", null, "10:04:00"]);
    type(segment(container, "minute"), "5");
    expect(seen).toEqual(["10:03:00", null, "10:04:00", "10:45:00"]);
    expect(shown(container)).toEqual(["10", ":", "45"]);
  });

  it("TimeField (24-hour): 10:30, hour cleared, 0 typed, then 9: 01:30, null, 00:30, 09:30", () => {
    const { container, seen } = mount<TimeValue>(mode, new Time(10, 30), (props) => <TimeField label="Meeting time" {...props} />);
    clear(segment(container, "hour"));
    expect(seen).toEqual(["01:30:00", null]);
    type(segment(container, "hour"), "0");
    expect(seen).toEqual(["01:30:00", null, "00:30:00"]);
    type(segment(container, "hour"), "9");
    expect(seen).toEqual(["01:30:00", null, "00:30:00", "09:30:00"]);
  });

  it("DateField: 24.03.2026, month cleared, 1 typed, then 1: null, 2026-01-24, 2026-11-24", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "month"));
    expect(seen).toEqual([null]);
    type(segment(container, "month"), "1");
    expect(seen).toEqual([null, "2026-01-24"]);
    type(segment(container, "month"), "1");
    expect(seen).toEqual([null, "2026-01-24", "2026-11-24"]);
    expect(shown(container)).toEqual(["24", "/", "11", "/", "2026"]);
  });

  it("DateField: the same month typed again reports the date again, once", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "03");
    expect(seen).toEqual([null, "2026-03-24"]);
  });

  it("DateField hideYear: 24.03, month cleared, 1 typed: null, 2000-01-24", () => {
    const { container, seen } = mount(mode, new CalendarDate(2000, 3, 24), (props) => <DateField label="Anniversary" hideYear {...props} />);
    clear(segment(container, "month"));
    expect(seen).toEqual([null]);
    type(segment(container, "month"), "1");
    expect(seen).toEqual([null, "2000-01-24"]);
  });

  it("DatePicker: 24.03.2026, month cleared, 1 typed, then 1: null, 2026-01-24, 2026-11-24", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DatePicker label="Review date" {...props} />);
    clear(segment(container, "month"));
    expect(seen).toEqual([null]);
    type(segment(container, "month"), "1");
    expect(seen).toEqual([null, "2026-01-24"]);
    type(segment(container, "month"), "1");
    expect(seen).toEqual([null, "2026-01-24", "2026-11-24"]);
  });

  describe("DateRangePicker with hours, both halves", () => {
    const RANGE: DateRangePickerValue = { start: new CalendarDateTime(2026, 10, 14, 10, 0), end: new CalendarDateTime(2026, 10, 18, 10, 0) };
    const field = (props: { value?: DateRangePickerValue | null; defaultValue?: DateRangePickerValue | null; onChange: (next: DateRangePickerValue | null) => void }) => (
      <DateRangePicker label="Trip dates" granularity="hour" {...props} />
    );

    it("start minutes cleared, 4 then 5 typed; end minutes cleared, 3 then 0 typed", () => {
      const { container, seen } = mount(mode, RANGE, field);
      clear(segment(container, "minute", 0));
      expect(seen).toEqual([null]);
      type(segment(container, "minute", 0), "4");
      type(segment(container, "minute", 0), "5");
      expect(seen).toEqual([null, "2026-10-14T10:04:00–2026-10-18T10:00:00", "2026-10-14T10:45:00–2026-10-18T10:00:00"]);
      clear(segment(container, "minute", 1));
      type(segment(container, "minute", 1), "3");
      type(segment(container, "minute", 1), "0");
      expect(seen.slice(3)).toEqual([null, "2026-10-14T10:45:00–2026-10-18T10:03:00", "2026-10-14T10:45:00–2026-10-18T10:30:00"]);
    });

    it("start hour cleared, 1 then 4 typed; end month cleared, 1 then 1 typed", () => {
      const { container, seen } = mount(mode, RANGE, field);
      clear(segment(container, "hour", 0));
      type(segment(container, "hour", 0), "1");
      type(segment(container, "hour", 0), "4");
      // "10" backspaced shows "1" (01:00, a time), then the placeholder; 1 typed shows 01:00 again, then 14.
      expect(seen).toEqual([
        "2026-10-14T01:00:00–2026-10-18T10:00:00",
        null,
        "2026-10-14T01:00:00–2026-10-18T10:00:00",
        "2026-10-14T14:00:00–2026-10-18T10:00:00",
      ]);
      clear(segment(container, "month", 1));
      type(segment(container, "month", 1), "1");
      type(segment(container, "month", 1), "1");
      // January 18th falls before the start: React Aria reports the range, the DS judges its order on blur, as before.
      expect(seen.slice(4)).toEqual([
        "2026-10-14T14:00:00–2026-01-18T10:00:00",
        null,
        "2026-10-14T14:00:00–2026-01-18T10:00:00",
        "2026-10-14T14:00:00–2026-11-18T10:00:00",
      ]);
    });
  });
});

describe.each(MODES)("a first 0 is no value, %s", (mode) => {
  it("DateField month: cleared, 0 typed shows 00 and reports nothing more; 5 then reports May", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "0");
    expect(shown(container)).toEqual(["24", "/", "00", "/", "2026"]);
    expect(seen).toEqual([null]);
    type(segment(container, "month"), "5");
    expect(shown(container)).toEqual(["24", "/", "05", "/", "2026"]);
    expect(seen).toEqual([null, "2026-05-24"]);
  });

  it("DateField month: a saved date's month overtyped with 0 reports null", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    type(segment(container, "month"), "0");
    expect(shown(container)).toEqual(["24", "/", "00", "/", "2026"]);
    expect(seen).toEqual([null]);
  });

  it("DateField month 00 left: stays 00, names the month, never January", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "0");
    blur();
    expect(shown(container)).toEqual(["24", "/", "00", "/", "2026"]);
    expect(seen).toEqual([null]);
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
    expect(invalid(container)).toBe(true);
  });

  it("DateField day 00 left: stays 00, names the day, never the 2nd or the 1st", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "day"));
    expect(seen).toEqual(["2026-03-02", null]);
    type(segment(container, "day"), "0");
    expect(seen).toEqual(["2026-03-02", null]);
    blur();
    expect(shown(container)).toEqual(["00", "/", "03", "/", "2026"]);
    expect(seen).toEqual(["2026-03-02", null]);
    expect(screen.getByText("Incomplete date: enter the day, or clear the field.")).toBeTruthy();
  });

  it("DateField year 0 left: names the year, never reports it", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "year"));
    const cleared = ["0202-03-24", "0020-03-24", "0002-03-24", null];
    expect(seen).toEqual(cleared);
    type(segment(container, "year"), "0");
    expect(seen).toEqual(cleared);
    blur();
    expect(seen).toEqual(cleared);
    expect(screen.getByText("Incomplete date: enter the year, or clear the field.")).toBeTruthy();
  });

  it("DatePicker month 0: null, then the month typed reports it", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 3, 24), (props) => <DatePicker label="Review date" {...props} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "0");
    expect(seen).toEqual([null]);
    type(segment(container, "month"), "5");
    expect(seen).toEqual([null, "2026-05-24"]);
  });

  it("TimeField 12-hour (en-US): hour 0 is no hour (it runs 1–12); 9 then reports 9:30", () => {
    const { container, seen } = mount<TimeValue>(mode, new Time(10, 30), (props) => <TimeField label="Meeting time" {...props} />, "en-US");
    clear(segment(container, "hour"));
    expect(seen).toEqual(["01:30:00", null]);
    type(segment(container, "hour"), "0");
    expect(seen).toEqual(["01:30:00", null]);
    type(segment(container, "hour"), "9");
    expect(seen).toEqual(["01:30:00", null, "09:30:00"]);
  });

  it("TimeField 12-hour (en-US): hour 0 left stays, names the hour, never 1:30", () => {
    const { container, seen } = mount<TimeValue>(mode, new Time(10, 30), (props) => <TimeField label="Meeting time" {...props} />, "en-US");
    clear(segment(container, "hour"));
    type(segment(container, "hour"), "0");
    blur();
    expect(seen).toEqual(["01:30:00", null]);
    expect(screen.getByText("Incomplete time: enter the hour, or clear the field.")).toBeTruthy();
  });

  it("DateRangePicker: the end month 0 is no month", () => {
    const RANGE: DateRangePickerValue = { start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) };
    const { container, seen } = mount<DateRangePickerValue>(mode, RANGE, (props) => <DateRangePicker label="Trip dates" {...props} />);
    clear(segment(container, "month", 1));
    expect(seen).toEqual(["2026-10-14–2026-01-18", null]);
    type(segment(container, "month", 1), "0");
    blur();
    expect(seen).toEqual(["2026-10-14–2026-01-18", null]);
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
  });
});

describe.each(MODES)("an impossible date holds no value either, %s", (mode) => {
  it("a saved 31.10.2026 with its month cleared and 11 typed ends at null, never 31.10 again or 30.11", () => {
    const { container, seen } = mount(mode, new CalendarDate(2026, 10, 31), (props) => <DateField label="Expiry date" {...props} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "11");
    blur();
    expect(shown(container)).toEqual(["31", "/", "11", "/", "2026"]);
    // "10" backspaced shows "1" (31 January, a date), then the placeholder; "1" typed is 31 January again, "11" names none.
    expect(seen).toEqual(["2026-01-31", null, "2026-01-31", null]);
    expect(screen.getByText("November has 30 days.")).toBeTruthy();
  });
});
