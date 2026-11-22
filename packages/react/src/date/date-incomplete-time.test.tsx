import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Form } from "../form/index";
import { DateField, TimeField, type DateRangePickerValue } from "./index";
import { DateRangePicker } from "./pickers";

/**
 * A time typed in part is no time: DateField, DatePicker and DateRangePicker report an incomplete
 * value as incomplete or invalid, as a date typed in part is no date: React Aria keeps its last complete value until
 * every segment is cleared, so a TimeField or a range with hours left at "10:––" still held the old minutes.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "en-GB") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function segment(root: ParentNode, kind: string, nth = 0) {
  return root.querySelectorAll<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`)[nth]!;
}
function type(el: HTMLElement, text: string) {
  act(() => el.focus());
  for (const data of text) {
    act(() => {
      (document.activeElement ?? el).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
    });
  }
}
/**
 * Backspace in a segment until it shows its placeholder (focus stays in the field). AM/PM is not a number, so React
 * Aria clears it on the Backspace key, not on the input event.
 */
function clear(el: HTMLElement) {
  act(() => el.focus());
  for (let i = 0; i < 5 && !el.hasAttribute("data-placeholder"); i++) {
    act(() => {
      if (el.dataset.type === "dayPeriod") fireEvent.keyDown(el, { key: "Backspace" });
      else el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
    });
  }
}
function blur() {
  act(() => (document.activeElement as HTMLElement | null)?.blur());
}
const invalid = (root: ParentNode) => root.querySelector("[data-slot='input-group']")?.hasAttribute("data-invalid") ?? false;
const MINUTE_MISSING = "Incomplete time: enter the minutes, or clear the field.";

describe("TimeField: a time typed in part", () => {
  it("clearing the minutes of a saved time reports null, keeps the hour and says what is missing on blur", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 30)} onChange={onChange} />);
    clear(segment(container, "minute"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(segment(container, "hour").textContent).toBe("10");
    expect(segment(container, "minute").hasAttribute("data-placeholder")).toBe(true);
    expect(screen.queryByText(MINUTE_MISSING)).toBeNull();
    blur();
    expect(screen.getByText(MINUTE_MISSING)).toBeTruthy();
    expect(invalid(container)).toBe(true);
  });

  it("controlled: the app's null keeps the typed hour; the same minutes typed again report the time again", () => {
    const seen: unknown[] = [];
    function Saved() {
      const [value, setValue] = React.useState<Time | null>(new Time(10, 30));
      return <TimeField label="Meeting time" value={value} onChange={(next) => { seen.push(next); setValue(next as Time | null); }} />;
    }
    const { container } = inLocale(<Saved />);
    clear(segment(container, "minute"));
    expect(seen.at(-1)).toBeNull();
    expect(segment(container, "hour").textContent).toBe("10");
    type(segment(container, "minute"), "30");
    expect(seen.at(-1)).toEqual(new Time(10, 30));
    blur();
    expect(screen.queryByText(MINUTE_MISSING)).toBeNull();
    expect(invalid(container)).toBe(false);
  });

  it("the hour and the minutes cleared is empty: null, and required says so", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="Meeting time" isRequired defaultValue={new Time(10, 30)} onChange={onChange} />);
    clear(segment(container, "hour"));
    clear(segment(container, "minute"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.queryByText(/Incomplete time/)).toBeNull();
    expect(screen.getByText("Fill in this field.")).toBeTruthy();
  });

  it("a new time typed part by part reports nothing and shows no error until it is complete", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="Meeting time" onChange={onChange} />);
    type(segment(container, "hour"), "09");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/Incomplete time/)).toBeNull();
    type(segment(container, "minute"), "15");
    expect(onChange).toHaveBeenLastCalledWith(new Time(9, 15));
  });

  it("12-hour clock (en-US): AM/PM is named only once the hour is typed and it is empty", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 30)} onChange={onChange} />, "en-US");
    clear(segment(container, "dayPeriod"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.getByText("Incomplete time: enter AM/PM, or clear the field.")).toBeTruthy();
  });

  it("12-hour clock: the hour cleared names the hour, not AM/PM (typing the hour fills it)", () => {
    const { container } = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 30)} />, "en-US");
    clear(segment(container, "hour"));
    blur();
    expect(screen.getByText("Incomplete time: enter the hour, or clear the field.")).toBeTruthy();
  });

  it("12-hour clock: an AM/PM left over in a field emptied of its hour and minutes is an empty field", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="Meeting time" isRequired defaultValue={new Time(10, 30)} onChange={onChange} />, "en-US");
    clear(segment(container, "hour"));
    clear(segment(container, "minute"));
    expect(segment(container, "dayPeriod").hasAttribute("data-placeholder")).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.queryByText(/Incomplete time/)).toBeNull();
  });

  it("a DS Form refuses a time typed in part", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = inLocale(
      <Form onSubmit={onSubmit}>
        <TimeField label="Meeting time" name="meeting" defaultValue={new Time(10, 30)} />
        <button type="submit">Save</button>
      </Form>,
    );
    clear(segment(container, "minute"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(MINUTE_MISSING)).toBeTruthy();
  });

  it("native validation: the browser's check refuses it with the message", () => {
    const { container } = inLocale(
      <Form validationBehavior="native" onSubmit={(event) => event.preventDefault()}>
        <TimeField label="Meeting time" name="meeting" defaultValue={new Time(10, 30)} />
      </Form>,
    );
    const form = container.querySelector("form")!;
    expect(form.checkValidity()).toBe(true);
    clear(segment(container, "minute"));
    expect(form.checkValidity()).toBe(false);
    expect(container.querySelector<HTMLInputElement>("input[name='meeting']")!.validationMessage).toBe(MINUTE_MISSING);
  });
});

describe("DateRangePicker granularity hour: a date and time typed in part", () => {
  const RANGE = { start: new CalendarDateTime(2026, 10, 14, 10, 0), end: new CalendarDateTime(2026, 10, 18, 10, 0) };

  it("the start minutes cleared: null and the minutes named in the date-and-time sentence", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE} onChange={onChange} />);
    clear(segment(container, "minute", 0));
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.getByText("Incomplete date and time: enter the minutes, or clear the field.")).toBeTruthy();
    expect(invalid(container)).toBe(true);
  });

  it("the end's day and hour cleared name both, in the field's order", () => {
    const { container } = inLocale(<DateRangePicker label="Trip dates" granularity="hour" defaultValue={RANGE} />);
    clear(segment(container, "day", 1));
    clear(segment(container, "hour", 1));
    blur();
    expect(screen.getByText("Incomplete date and time: enter the day and the hour, or clear the field.")).toBeTruthy();
  });

  it("the end half emptied while the start stands: every part of it named; typed again, the range again", () => {
    const seen: (DateRangePickerValue | null)[] = [];
    function Trip() {
      const [value, setValue] = React.useState<DateRangePickerValue | null>(RANGE);
      return <DateRangePicker label="Trip dates" granularity="hour" value={value} onChange={(next) => { seen.push(next); setValue(next); }} />;
    }
    const { container } = inLocale(<Trip />);
    for (const kind of ["day", "month", "year", "hour", "minute"]) clear(segment(container, kind, 1));
    expect(seen.at(-1)).toBeNull();
    blur();
    expect(screen.getByText("Incomplete date and time: enter the day, the month, the year, the hour, and the minutes, or clear the field.")).toBeTruthy();
    type(segment(container, "day", 1), "181020261000");
    expect(seen.at(-1)).toEqual(RANGE);
    expect(screen.queryByText(/Incomplete date and time/)).toBeNull();
  });

  it("granularity day is unchanged: the date sentence", () => {
    const { container } = inLocale(
      <DateRangePicker label="Trip dates" defaultValue={{ start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) }} />,
    );
    clear(segment(container, "month", 1));
    blur();
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
  });
});

describe("DateField and DatePicker have no time part in the DS", () => {
  it("a date-time value shows its date only, so only the date can be incomplete", () => {
    const { container } = inLocale(<DateField label="Date" defaultValue={new CalendarDateTime(2026, 3, 24, 10, 30) as unknown as CalendarDate} />);
    expect(container.querySelector("[data-slot='date-segment'][data-type='hour'], [data-slot='date-segment'][data-type='minute']")).toBeNull();
  });
});
