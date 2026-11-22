import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Form } from "../form/index";
import { registerDsStrings } from "../i18n";
import { DateField, DatePicker, DateRangePicker, type DateRangePickerValue } from "./index";

/**
 * A date typed in part is no date. React Aria keeps its last complete value until every segment is cleared, and a
 * hidden year never is: a month–day with its month cleared showed "mm/1" and saved the old month, a date with its
 * month backspaced showed "mm/1/2026" and saved 2026-01-01.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "en-GB") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function shown(root: ParentNode) {
  return Array.from(root.querySelectorAll("[data-slot='date-segment']"))
    .map((s) => (s.textContent ?? "").replace(/[⁦-⁩]/g, ""))
    .filter((text) => text !== "");
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
/** Backspace in a segment until it shows its placeholder (focus stays in the field). */
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
const MONTH_MISSING = "Incomplete date: enter the month, or clear the field.";
const REQUIRED = "Fill in this field.";
const invalid = (root: ParentNode) => root.querySelector("[data-slot='input-group']")?.hasAttribute("data-invalid") ?? false;

describe("DateField: a date typed in part", () => {
  it("clearing the month of a saved date reports null, keeps the typed parts and says what is missing on blur", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Expiry date" defaultValue={new CalendarDate(2026, 3, 24)} onChange={onChange} />);
    clear(segment(container, "month"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(shown(container)).toEqual(["24", "/", "mm", "/", "2026"]);
    expect(screen.queryByText(MONTH_MISSING)).toBeNull();
    blur();
    expect(screen.getByText(MONTH_MISSING)).toBeTruthy();
    expect(invalid(container)).toBe(true);
  });

  it("controlled: the app's null does not wipe the typed parts; the same month typed again reports the date again", () => {
    const seen: (CalendarDate | null)[] = [];
    function Saved() {
      const [value, setValue] = React.useState<CalendarDate | null>(new CalendarDate(2026, 3, 24));
      return <DateField label="Expiry date" value={value} onChange={(next) => { seen.push(next); setValue(next); }} />;
    }
    const { container } = inLocale(<Saved />);
    clear(segment(container, "month"));
    expect(seen.at(-1)).toBeNull();
    expect(shown(container)).toEqual(["24", "/", "mm", "/", "2026"]);
    type(segment(container, "month"), "03");
    expect(seen.at(-1)).toEqual(new CalendarDate(2026, 3, 24));
    expect(shown(container)).toEqual(["24", "/", "03", "/", "2026"]);
    blur();
    expect(screen.queryByText(MONTH_MISSING)).toBeNull();
    expect(invalid(container)).toBe(false);
  });

  it("another month typed instead reports that date and clears the error", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Expiry date" defaultValue={new CalendarDate(2026, 3, 24)} onChange={onChange} />);
    clear(segment(container, "month"));
    blur();
    expect(screen.getByText(MONTH_MISSING)).toBeTruthy();
    type(segment(container, "month"), "05");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2026, 5, 24));
    expect(screen.queryByText(MONTH_MISSING)).toBeNull();
  });

  it("en-US: the month backspaced shows mm/1/2026 and reports null, never 2026-01-01", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Paid on" defaultValue={new CalendarDate(2026, 3, 1)} onChange={onChange} />, "en-US");
    clear(segment(container, "month"));
    expect(shown(container)).toEqual(["mm", "/", "1", "/", "2026"]);
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([null]);
    blur();
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
  });

  it("names several missing parts in the locale's list", () => {
    const { container } = inLocale(<DateField label="Birthday" defaultValue={new CalendarDate(1990, 3, 24)} />);
    clear(segment(container, "day"));
    clear(segment(container, "month"));
    blur();
    expect(screen.getByText("Incomplete date: enter the day and the month, or clear the field.")).toBeTruthy();
  });

  it("a new date typed part by part reports nothing and shows no error until it is complete or left", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Birthday" onChange={onChange} />);
    type(segment(container, "day"), "24");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/Incomplete date/)).toBeNull();
    type(segment(container, "month"), "031990");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(1990, 3, 24));
  });

  it("clearing every segment is empty as before: null, and required says so", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Birthday" isRequired defaultValue={new CalendarDate(1990, 3, 24)} onChange={onChange} />);
    clear(segment(container, "day"));
    clear(segment(container, "month"));
    clear(segment(container, "year"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.queryByText(/Incomplete date/)).toBeNull();
    expect(screen.getByText(REQUIRED)).toBeTruthy();
  });
});

describe("DateField hideYear: the year is never cleared", () => {
  it("a month–day with its month cleared (mm/1) reports null and says the month is missing", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Season start" hideYear defaultValue={new CalendarDate(2000, 6, 1)} onChange={onChange} />, "en-US");
    clear(segment(container, "month"));
    expect(shown(container)).toEqual(["mm", "/", "1"]);
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
  });

  it("day and month both cleared is empty: null (React Aria never reported it), and required says so", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Season start" hideYear isRequired defaultValue={new CalendarDate(2000, 6, 1)} onChange={onChange} />);
    clear(segment(container, "day"));
    clear(segment(container, "month"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.getByText(REQUIRED)).toBeTruthy();
    type(segment(container, "day"), "0106");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2000, 6, 1));
  });
});

describe("DatePicker: a date typed in part", () => {
  it("clearing the month reports null, keeps the parts and says what is missing", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DatePicker label="Due date" defaultValue={new CalendarDate(2026, 3, 24)} onChange={onChange} />);
    clear(segment(container, "month"));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(shown(container)).toEqual(["24", "/", "mm", "/", "2026"]);
    blur();
    expect(screen.getByText(MONTH_MISSING)).toBeTruthy();
  });
});

describe("DateRangePicker: start and end", () => {
  const RANGE = { start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) };

  it("the start month cleared: null and the missing month", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateRangePicker label="Trip dates" defaultValue={RANGE} onChange={onChange} />);
    clear(segment(container, "month", 0));
    expect(onChange).toHaveBeenLastCalledWith(null);
    blur();
    expect(screen.getByText(MONTH_MISSING)).toBeTruthy();
  });

  it("the end half emptied while the start stands: null, all of its parts missing; typed again, the range again", () => {
    const seen: (DateRangePickerValue | null)[] = [];
    function Trip() {
      const [value, setValue] = React.useState<DateRangePickerValue | null>(RANGE);
      return <DateRangePicker label="Trip dates" value={value} onChange={(next) => { seen.push(next); setValue(next); }} />;
    }
    const { container } = inLocale(<Trip />);
    clear(segment(container, "day", 1));
    clear(segment(container, "month", 1));
    clear(segment(container, "year", 1));
    expect(seen.at(-1)).toBeNull();
    expect(shown(container).slice(0, 5)).toEqual(["14", "/", "10", "/", "2026"]);
    blur();
    expect(screen.getByText("Incomplete date: enter the day, the month, and the year, or clear the field.")).toBeTruthy();
    type(segment(container, "day", 1), "18102026");
    expect(seen.at(-1)).toEqual(RANGE);
    expect(screen.queryByText(/Incomplete date/)).toBeNull();
  });
});

describe("the form refuses a date typed in part", () => {
  it("Form (aria): submit is blocked, the message shows, the field is marked invalid", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = inLocale(
      <Form onSubmit={onSubmit}>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
        <button type="submit">Save</button>
      </Form>,
    );
    clear(segment(container, "month"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(MONTH_MISSING)).toBeTruthy();
    expect(container.querySelector("[role='group'][aria-invalid='true'], [data-slot='date-segment'][aria-invalid='true']")).not.toBeNull();
  });

  it("native: the browser's check refuses the form with the message", () => {
    const { container } = inLocale(
      <Form validationBehavior="native" onSubmit={(event) => event.preventDefault()}>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
      </Form>,
    );
    const form = container.querySelector("form")!;
    expect(form.checkValidity()).toBe(true);
    clear(segment(container, "month"));
    expect(form.checkValidity()).toBe(false);
    const input = container.querySelector<HTMLInputElement>("input[name='expiry']")!;
    expect(input.validationMessage).toBe(MONTH_MISSING);
  });

  it("native, hideYear, required, both parts cleared: the browser's check refuses it as empty", () => {
    const { container } = inLocale(
      <Form validationBehavior="native" onSubmit={(event) => event.preventDefault()}>
        <DateField label="Season start" name="season" hideYear isRequired defaultValue={new CalendarDate(2000, 6, 1)} />
      </Form>,
    );
    const form = container.querySelector("form")!;
    clear(segment(container, "day"));
    clear(segment(container, "month"));
    expect(form.checkValidity()).toBe(false);
    expect(container.querySelector<HTMLInputElement>("input[name='season']")!.validationMessage).toBe(REQUIRED);
  });
});

describe("the message's language", () => {
  it("a locale without registered words reads the English sentence with English part names", () => {
    const { container } = inLocale(<DateField label="Date" defaultValue={new CalendarDate(2026, 3, 24)} />, "he-IL");
    clear(segment(container, "month"));
    blur();
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
  });

  it("a locale the app registered a sentence for (registerDsStrings) reads that sentence", () => {
    registerDsStrings("de", { dateIncomplete: "Datum unvollständig ({parts})." });
    const { container } = inLocale(<DateField label="Date" defaultValue={new CalendarDate(2026, 3, 24)} />, "de-DE");
    clear(segment(container, "day"));
    clear(segment(container, "month"));
    blur();
    expect(screen.getByText(/^Datum unvollständig \(.+\)\.$/)).toBeTruthy();
    expect(screen.queryByText(/Incomplete date/)).toBeNull();
  });
});
