import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DateField, DatePicker, DateRangePicker, TimeField } from "./index";
import { rangeDuration } from "./pickers";

afterEach(cleanup);

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

function inLocale(ui: React.ReactElement, locale = "en-GB", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

/** The segments a user sees, in order: "15", "/", "mm". */
function shown(root: ParentNode) {
  // Intl wraps times in bidi isolates (U+2066…U+2069); they are invisible, so the user does not "see" them.
  return Array.from(root.querySelectorAll("[data-slot='date-segment']"))
    .map((s) => (s.textContent ?? "").replace(/[\u2066-\u2069]/g, ""))
    .filter((text) => text !== "");
}
function segment(root: ParentNode, type: string) {
  return root.querySelector<HTMLElement>(`[data-slot='date-segment'][data-type='${type}']`)!;
}
/** Types the way a browser does: one `beforeinput` per character into the focused segment. */
function type(el: HTMLElement, text: string) {
  act(() => el.focus());
  for (const data of text) {
    act(() => {
      (document.activeElement ?? el).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
    });
  }
}
function blur() {
  act(() => (document.activeElement as HTMLElement | null)?.blur());
}
function key(k: string) {
  fireEvent.keyDown(document.activeElement!, { key: k });
  fireEvent.keyUp(document.activeElement!, { key: k });
}

describe("DateField", () => {
  it("en-GB: day, month, year with slashes and dd/mm/yyyy placeholders", () => {
    const { container } = inLocale(<DateField label="Birth date" />);
    expect(shown(container)).toEqual(["dd", "/", "mm", "/", "yyyy"]);
    expect(segment(container, "day").className).toContain("data-[placeholder]:uppercase");
  });

  it("en-US: month first, slashes", () => {
    const { container } = inLocale(<DateField label="Birth date" />, "en-US");
    expect(shown(container)).toEqual(["mm", "/", "dd", "/", "yyyy"]);
  });

  it("typing moves through the segments and commits the date", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Birth date" onChange={onChange} />);
    type(segment(container, "day"), "24031990");
    expect(shown(container)).toEqual(["24", "/", "03", "/", "1990"]);
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(1990, 3, 24));
  });

  it("the label names the field, and arrows step a segment", () => {
    const { container } = inLocale(<DateField label="Issue date" defaultValue={new CalendarDate(2015, 6, 12)} />);
    const group = container.querySelector("[data-slot='date-input']")!;
    const labelId = screen.getByText("Issue date").id;
    expect(group.getAttribute("aria-labelledby")).toContain(labelId);
    act(() => segment(container, "month").focus());
    key("ArrowUp");
    expect(segment(container, "month").textContent).toBe("07");
  });

  describe("month–day never turns a lone day into January", () => {
    it("hideYear shows day and month only", () => {
      const { container } = inLocale(<DateField label="Anniversary" hideYear />);
      expect(shown(container)).toEqual(["dd", "/", "mm"]);
    });

    it("a day typed first leaves the month empty and the value incomplete", () => {
      const onChange = vi.fn();
      const { container } = inLocale(<DateField label="Anniversary" hideYear onChange={onChange} />);
      type(segment(container, "day"), "15");
      blur();
      expect(segment(container, "month").hasAttribute("data-placeholder")).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
      type(segment(container, "month"), "03");
      expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2000, 3, 15));
      expect(onChange.mock.calls.every(([v]) => v === null || v.month !== 1)).toBe(true);
    });

    it("29 February exists (the hidden year is a leap year)", () => {
      const onChange = vi.fn();
      const { container } = inLocale(<DateField label="Anniversary" hideYear onChange={onChange} />);
      type(segment(container, "day"), "2902");
      expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2000, 2, 29));
    });
  });

  it.each([
    ["sr-Latn-ME", { hideYear: true }, "dd. mm."],
    ["bg-BG", { granularity: "month" as const }, "мм.гггг\u202fг."],
    ["hu-HU", { granularity: "month" as const }, "éééé. hh."],
    ["en-US", { granularity: "month" as const }, "mm/yyyy"],
    ["en-US", { hideYear: true }, "mm/dd"],
    ["en-GB", { hideYear: true }, "dd/mm"],
    ["bg-BG", { hideYear: true }, "дд.мм"],
    ["mk-MK", { hideYear: true }, "dd.mm"], // React Aria has no mk placeholders; the point is " г." is gone
  ])("%s %o keeps the locale's own separators and closing suffix: %s", (locale, props, expected) => {
    const { container } = inLocale(<DateField label="X" {...props} />, locale);
    expect(shown(container).join("")).toBe(expected);
  });

  it("granularity month: month and year, the day is 1", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Valid until" granularity="month" onChange={onChange} />);
    expect(shown(container)).toEqual(["mm", "/", "yyyy"]);
    type(segment(container, "month"), "112027");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2027, 11, 1));
  });

  describe("an impossible date stays as typed, with an error, never corrected", () => {
    it("31/11/2026: no 30/11 or 1/12, and the error names the month", () => {
      const onChange = vi.fn();
      const { container } = inLocale(<DateField label="Expiry date" onChange={onChange} />);
      type(segment(container, "day"), "31112026");
      expect(shown(container)).toEqual(["31", "/", "11", "/", "2026"]);
      blur();
      expect(onChange.mock.calls.every(([v]) => v === null)).toBe(true);
      expect(screen.getByText("November has 30 days.")).toBeTruthy();
      expect(container.querySelector("[data-slot='input-group']")?.hasAttribute("data-invalid")).toBe(true);
    });

    it("the error waits for blur, and goes when the day is fixed", () => {
      const { container } = inLocale(<DateField label="Expiry date" />);
      type(segment(container, "day"), "31112026");
      expect(screen.queryByText("November has 30 days.")).toBeNull();
      blur();
      expect(screen.getByText("November has 30 days.")).toBeTruthy();
      type(segment(container, "day"), "30");
      expect(screen.queryByText("November has 30 days.")).toBeNull();
    });

    it("en-US words it in English", () => {
      const { container } = inLocale(<DateField label="Expiry" />, "en-US");
      type(segment(container, "month"), "02302026");
      blur();
      expect(screen.getByText("February has 28 days.")).toBeTruthy();
    });

    it("editing a saved date into 31/11 is not clamped to 30/11 either", () => {
      const onChange = vi.fn();
      const { container } = inLocale(<DateField label="Expiry date" defaultValue={new CalendarDate(2026, 10, 31)} onChange={onChange} />);
      type(segment(container, "month"), "11");
      blur();
      expect(shown(container)).toEqual(["31", "/", "11", "/", "2026"]);
      expect(onChange.mock.calls.some(([v]) => v && v.month === 11 && v.day === 30)).toBe(false);
      expect(screen.getByText("November has 30 days.")).toBeTruthy();
    });

    it("29/02/2024 edited to 2025 stays 29/02/2025 with an error", () => {
      const onChange = vi.fn();
      const { container } = inLocale(<DateField label="Date" defaultValue={new CalendarDate(2024, 2, 29)} onChange={onChange} />);
      type(segment(container, "year"), "2025");
      blur();
      expect(shown(container)).toEqual(["29", "/", "02", "/", "2025"]);
      expect(onChange.mock.calls.some(([v]) => v && v.year === 2025)).toBe(false);
      expect(screen.getByText("February has 28 days.")).toBeTruthy();
    });

    it("out of range stays as typed and is invalid after blur", () => {
      const onChange = vi.fn();
      const { container } = inLocale(<DateField label="Due date" minValue={new CalendarDate(2026, 10, 1)} onChange={onChange} />);
      type(segment(container, "day"), "15092026");
      blur();
      expect(shown(container)).toEqual(["15", "/", "09", "/", "2026"]);
      expect(container.querySelector("[data-slot='input-group']")?.hasAttribute("data-invalid")).toBe(true);
    });
  });

  it("required: an empty field says so on blur", () => {
    const { container } = inLocale(<DateField label="Birth date" isRequired />);
    act(() => segment(container, "day").focus());
    blur();
    expect(container.querySelector("[data-slot='field-error']")).toBeTruthy();
  });

  it("Backspace clears a segment and keeps the others", () => {
    const { container } = inLocale(<DateField label="Birth date" defaultValue={new CalendarDate(1990, 3, 24)} />);
    act(() => segment(container, "year").focus());
    for (let i = 0; i < 4; i++) {
      act(() => {
        document.activeElement!.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
      });
    }
    expect(shown(container)).toEqual(["24", "/", "03", "/", "yyyy"]);
  });
});

describe("TimeField", () => {
  it("en-GB is 24-hour, en-US has AM/PM", () => {
    const gb = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 30)} />).container;
    expect(shown(gb)).toEqual(["10", ":", "30"]);
    cleanup();
    const en = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 30)} />, "en-US").container;
    expect(shown(en).join("")).toMatch(/^10:30\s?AM$/);
  });

  it("minuteStep: arrows move by 15 minutes", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 7)} minuteStep={15} onChange={onChange} />);
    act(() => segment(container, "minute").focus());
    key("ArrowUp");
    expect(segment(container, "minute").textContent).toBe("15");
    key("ArrowUp");
    expect(segment(container, "minute").textContent).toBe("30");
    key("ArrowDown");
    key("ArrowDown");
    key("ArrowDown");
    expect(segment(container, "minute").textContent).toBe("45");
    expect(onChange).toHaveBeenLastCalledWith(new Time(10, 45));
  });

  it("names the field's zone when it is not the user's", () => {
    const { container } = inLocale(<TimeField label="Meeting time" defaultValue={new Time(10, 30)} timeZone="Pacific/Kiritimati" />);
    expect(container.querySelector("[data-slot='time-field-zone']")?.textContent).toMatch(/^Kiritimati \(GMT\+14\)$/);
  });

  it("segments flow inline, so the bidi isolates keep 10:30 left to right on an RTL page", () => {
    const { container } = inLocale(<TimeField label="الوقت" defaultValue={new Time(10, 30)} />, "ar", "rtl");
    const input = container.querySelector("[data-slot='date-input']")!;
    expect(input.className).not.toMatch(/(^|\s)(inline-)?flex(\s|$)/);
    expect(input.textContent).toMatch(/^\u2066/);
  });

  it("has a clock icon and no physical classes in RTL", () => {
    const { container } = inLocale(<TimeField label="الوقت" timeZone="Pacific/Kiritimati" />, "ar", "rtl");
    expect(container.querySelector("[data-slot='field-icon']")).toBeTruthy();
    for (const el of Array.from(container.querySelectorAll("[class]"))) expect(el.getAttribute("class")).not.toMatch(PHYSICAL);
  });
});

describe("DatePicker", () => {
  // The calendar labels the real today's cell "today", which changes the name the
  // picking tests click by; a fixed clock keeps them off the cells they pick.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("the label names the field and the calendar button", () => {
    inLocale(<DatePicker label="Review date" />);
    const labelId = screen.getByText("Review date").id;
    const button = screen.getByRole("button", { name: /Review date/ });
    expect(button.getAttribute("aria-labelledby")).toContain(labelId);
  });

  it("picking a day fills the field and closes the calendar", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DatePicker label="Review date" defaultValue={new CalendarDate(2026, 10, 14)} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Review date/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /(^|, )20 October 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2026, 10, 20));
    expect(shown(container)).toEqual(["20", "/", "10", "/", "2026"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Today picks today in the field's zone; Clear empties the field", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DatePicker label="Review date" defaultValue={new CalendarDate(2026, 10, 14)} onChange={onChange} timeZone="Europe/Podgorica" />);
    fireEvent.click(screen.getByRole("button", { name: /Review date/ }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    const today = onChange.mock.calls.at(-1)![0] as CalendarDate;
    const expected = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Podgorica" }).format(new Date());
    expect(today.toString()).toBe(expected);
    fireEvent.click(screen.getByRole("button", { name: /Review date/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(shown(container)).toEqual(["dd", "/", "mm", "/", "yyyy"]);
  });

  it("picking returns focus to the field, not the calendar button", async () => {
    const { container } = inLocale(<DatePicker label="Review date" defaultValue={new CalendarDate(2026, 10, 14)} />);
    fireEvent.click(screen.getByRole("button", { name: /Review date/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /(^|, )20 October 2026/ }));
    await waitFor(() => expect(document.activeElement).toBe(segment(container, "day")));
  });

  it("Escape after typing leaves focus on the calendar button", async () => {
    const { container } = inLocale(<DatePicker label="Review date" />);
    type(segment(container, "day"), "14102026");
    const button = screen.getByRole("button", { name: /Review date/ });
    act(() => button.focus());
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(container.contains(document.activeElement) && document.activeElement?.getAttribute("role") === "spinbutton").toBe(false);
  });

  it("a typed impossible date shows the same error as DateField", () => {
    const { container } = inLocale(<DatePicker label="Review date" />);
    type(segment(container, "day"), "31042026");
    blur();
    expect(screen.getByText("April has 30 days.")).toBeTruthy();
  });
});

describe("DateRangePicker", () => {
  const range = { start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) };

  it("two halves with their overlines; the label names the control", () => {
    const { container } = inLocale(<DateRangePicker label="Date range" defaultValue={range} />);
    expect(container.querySelector("[data-slot='date-range-start']")?.textContent).toContain("Start");
    expect(container.querySelector("[data-slot='date-range-end']")?.textContent).toContain("End");
    expect(shown(container.querySelector("[data-slot='date-range-start']")!)).toEqual(["14", "/", "10", "/", "2026"]);
    expect(screen.getByRole("button", { name: /Date range/ })).toBeTruthy();
  });

  it("picks the start then the end in the calendar; the footer counts the days beside the app's own content", () => {
    const onChange = vi.fn();
    inLocale(<DateRangePicker label="Date range" defaultValue={range} onChange={onChange} footer="Total 248.00" />);
    fireEvent.click(screen.getByRole("button", { name: /Date range/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("[data-slot='date-range-duration']")?.textContent).toBe("4 days");
    expect(dialog.querySelector("[data-slot='date-range-price']")?.textContent).toBe("Total 248.00");
    const day = (n: number) => within(dialog).getAllByRole("button").find((b) => new RegExp(`(^|, )${n} October 2026`).test(b.getAttribute("aria-label") ?? ""))!;
    fireEvent.click(day(20));
    fireEvent.click(day(23));
    expect(onChange).toHaveBeenLastCalledWith({ start: new CalendarDate(2026, 10, 20), end: new CalendarDate(2026, 10, 23) });
  });

  it("disabled, required, id and the error work on the range field", () => {
    const { container, rerender } = inLocale(<DateRangePicker label="Date range" id="range" isRequired isInvalid errorMessage="Choose the dates" />);
    expect(container.querySelector("#range")).toBeTruthy();
    expect(container.querySelector("[data-slot='field-required']")).toBeTruthy();
    expect(screen.getByText("Choose the dates")).toBeTruthy();
    rerender(
      <div>
        <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
          <DateRangePicker label="Date range" isDisabled defaultValue={range} />
        </DesignSystemProvider>
      </div>,
    );
    expect(container.querySelector("[data-slot='input-group']")?.hasAttribute("data-disabled")).toBe(true);
    expect((screen.getByRole("button", { name: /Date range/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("granularity hour: the halves carry the time and the calendar has time fields", () => {
    const withTime = { start: new CalendarDateTime(2026, 10, 14, 10, 0), end: new CalendarDateTime(2026, 10, 18, 10, 0) };
    const { container } = inLocale(<DateRangePicker label="Period" granularity="hour" defaultValue={withTime} />);
    expect(shown(container.querySelector("[data-slot='date-range-start']")!).join("")).toBe("14/10/2026, 10:00");
    fireEvent.click(screen.getByRole("button", { name: /Period/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Start time")).toBeTruthy();
    expect(within(dialog).getByText("End time")).toBeTruthy();
    expect(dialog.querySelector("[data-slot='date-range-duration']")?.textContent).toBe("4 days · 96 hours");
  });

  it("hour mode: one pick reports one change (the calendar does not commit twice)", () => {
    const onChange = vi.fn();
    const withTime = { start: new CalendarDateTime(2026, 10, 14, 10, 0), end: new CalendarDateTime(2026, 10, 18, 10, 0) };
    inLocale(<DateRangePicker label="Period" granularity="hour" defaultValue={withTime} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Period/ }));
    const dialog = screen.getByRole("dialog");
    const day = (n: number) => within(dialog).getAllByRole("button").find((b) => new RegExp(`(^|, )${n} October 2026`).test(b.getAttribute("aria-label") ?? ""))!;
    fireEvent.click(day(20));
    fireEvent.click(day(23));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].start).toEqual(new CalendarDateTime(2026, 10, 20, 10, 0));
  });

  it("a press under End focuses the end half, not the start", () => {
    const { container } = inLocale(<DateRangePicker label="Date range" defaultValue={range} />);
    const end = container.querySelector<HTMLElement>("[data-slot='date-range-end']")!;
    fireEvent.mouseDown(end.querySelector("[data-slot='date-range-overline']")!);
    expect(end.contains(document.activeElement)).toBe(true);
    const start = container.querySelector<HTMLElement>("[data-slot='date-range-start']")!;
    fireEvent.mouseDown(start.querySelector("[data-slot='date-range-overline']")!);
    expect(start.contains(document.activeElement)).toBe(true);
  });

  it("an impossible date in the end half shows the error and is not clamped", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateRangePicker label="Date range" defaultValue={range} onChange={onChange} />);
    const end = container.querySelector<HTMLElement>("[data-slot='date-range-end']")!;
    type(segment(end, "day"), "31");
    type(segment(end, "month"), "11");
    blur();
    expect(shown(end)).toEqual(["31", "/", "11", "/", "2026"]);
    expect(onChange.mock.calls.some(([v]) => v && v.end.day === 30)).toBe(false);
    expect(screen.getByText("November has 30 days.")).toBeTruthy();
  });

  it("duration counts started 24-hour blocks", () => {
    expect(rangeDuration(new CalendarDateTime(2026, 10, 14, 10, 0), new CalendarDateTime(2026, 10, 18, 10, 0))).toEqual({ days: 4, hours: 96 });
    expect(rangeDuration(new CalendarDateTime(2026, 10, 14, 10, 0), new CalendarDateTime(2026, 10, 18, 10, 30))).toEqual({ days: 5, hours: 97 });
    expect(rangeDuration(new CalendarDate(2026, 10, 14), new CalendarDate(2026, 10, 18))).toEqual({ days: 4 });
  });

  it("RTL: no physical classes", () => {
    const { container } = inLocale(<DateRangePicker label="التواريخ" defaultValue={range} footer="Total 248" />, "ar", "rtl");
    for (const el of Array.from(container.querySelectorAll("[class]"))) expect(el.getAttribute("class")).not.toMatch(PHYSICAL);
  });
});
