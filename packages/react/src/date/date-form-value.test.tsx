import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Form } from "../form/index";
import { DateField, DatePicker, DateRangePicker, TimeField, type DateRangePickerValue } from "./index";

/**
 * The form value of a date or time field follows the value the field reports. React Aria writes the
 * date it holds into its hidden `<input name>`, and while a date is typed in part, impossible or emptied around a hidden
 * part the field holds its last complete date underneath and reports null: a hideYear 10.02 edited to 30.02 reported
 * null and showed "February has 29 days." while a native submit sent 2000-02-03, the date passed on the way.
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

/** A plain HTML form (no DS Form): what it sends is its FormData. */
function NativeForm({ children }: { children: React.ReactNode }) {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      {children}
      <button type="submit">Save</button>
    </form>
  );
}
/** Submits the form natively and returns what it sent. */
function submit(container: HTMLElement) {
  const sent: Record<string, FormDataEntryValue>[] = [];
  const form = container.querySelector("form")!;
  const listener = (event: Event) => sent.push(Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)));
  form.addEventListener("submit", listener);
  fireEvent.submit(form);
  form.removeEventListener("submit", listener);
  return sent[0]!;
}

describe("DateField's form value follows the value it reports", () => {
  it("hideYear 10.02 edited to 30.02: the form sends nothing, not the 03.02 passed on the way; 29.02 is sent", () => {
    const onChange = vi.fn();
    const { container } = inLocale(
      <NativeForm>
        <DateField label="Season start" name="season" hideYear defaultValue={new CalendarDate(2000, 2, 10)} onChange={onChange} />
      </NativeForm>,
    );
    expect(submit(container)).toEqual({ season: "2000-02-10" });
    clear(segment(container, "day"));
    type(segment(container, "day"), "30");
    blur();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(container.textContent).toContain("February has 29 days.");
    expect(submit(container)).toEqual({ season: "" });
    clear(segment(container, "day"));
    type(segment(container, "day"), "29");
    blur();
    expect(onChange.mock.lastCall?.[0]?.toString()).toBe("2000-02-29");
    expect(submit(container)).toEqual({ season: "2000-02-29" });
  });

  it("a date typed in part sends nothing; completed again, the date is sent", () => {
    const { container } = inLocale(
      <NativeForm>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
      </NativeForm>,
    );
    clear(segment(container, "month"));
    expect(submit(container)).toEqual({ expiry: "" });
    type(segment(container, "month"), "03");
    expect(submit(container)).toEqual({ expiry: "2026-03-24" });
    clear(segment(container, "month"));
    type(segment(container, "month"), "04");
    expect(submit(container)).toEqual({ expiry: "2026-04-24" });
  });

  it("an impossible date (31.10 edited to month 11) sends nothing", () => {
    const { container } = inLocale(
      <NativeForm>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 10, 31)} />
      </NativeForm>,
    );
    clear(segment(container, "month"));
    type(segment(container, "month"), "11");
    blur();
    expect(container.textContent).toContain("November has 30 days.");
    expect(submit(container)).toEqual({ expiry: "" });
  });

  it("hideYear with both parts emptied sends nothing", () => {
    const { container } = inLocale(
      <NativeForm>
        <DateField label="Season start" name="season" hideYear defaultValue={new CalendarDate(2000, 6, 1)} />
      </NativeForm>,
    );
    clear(segment(container, "day"));
    clear(segment(container, "month"));
    expect(submit(container)).toEqual({ season: "" });
  });

  it("controlled: the app's null is sent while the typed parts stay, and its date once complete", () => {
    function App() {
      const [value, setValue] = React.useState<CalendarDate | null>(new CalendarDate(2026, 3, 24));
      return (
        <NativeForm>
          <DateField label="Expiry date" name="expiry" value={value} onChange={setValue} />
        </NativeForm>
      );
    }
    const { container } = inLocale(<App />);
    clear(segment(container, "day"));
    expect(submit(container)).toEqual({ expiry: "" });
    type(segment(container, "day"), "24");
    expect(submit(container)).toEqual({ expiry: "2026-03-24" });
  });

  it("a form reset after a date typed in part sends the default again", () => {
    const { container } = inLocale(
      <NativeForm>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
      </NativeForm>,
    );
    clear(segment(container, "month"));
    expect(submit(container)).toEqual({ expiry: "" });
    act(() => container.querySelector("form")!.reset());
    expect(submit(container)).toEqual({ expiry: "2026-03-24" });
  });

  it("native validation: the named input keeps the field's message, and its value is empty", () => {
    const { container } = inLocale(
      <Form validationBehavior="native" onSubmit={(event) => event.preventDefault()}>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
      </Form>,
    );
    const input = container.querySelector<HTMLInputElement>("input[name='expiry']")!;
    expect(input.value).toBe("2026-03-24");
    clear(segment(container, "month"));
    expect(input.value).toBe("");
    expect(input.validationMessage).toBe("Incomplete date: enter the month, or clear the field.");
    expect(container.querySelector("form")!.checkValidity()).toBe(false);
  });
});

describe("DatePicker, DateRangePicker and TimeField send what they report", () => {
  it("DatePicker: a date typed in part sends nothing; a complete one is sent", () => {
    const { container } = inLocale(
      <NativeForm>
        <DatePicker label="Review date" name="review" defaultValue={new CalendarDate(2026, 3, 24)} />
      </NativeForm>,
    );
    expect(submit(container)).toEqual({ review: "2026-03-24" });
    clear(segment(container, "month"));
    expect(submit(container)).toEqual({ review: "" });
    type(segment(container, "month"), "05");
    expect(submit(container)).toEqual({ review: "2026-05-24" });
  });

  it("DateRangePicker: one half typed in part sends neither half; complete, both are sent", () => {
    const RANGE: DateRangePickerValue = { start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) };
    const { container } = inLocale(
      <NativeForm>
        <DateRangePicker label="Trip dates" startName="start" endName="end" defaultValue={RANGE} />
      </NativeForm>,
    );
    expect(submit(container)).toEqual({ start: "2026-10-14", end: "2026-10-18" });
    clear(segment(container, "month", 0));
    expect(submit(container)).toEqual({ start: "", end: "" });
    type(segment(container, "month", 0), "10");
    expect(submit(container)).toEqual({ start: "2026-10-14", end: "2026-10-18" });
  });

  it("DateRangePicker with hours: a time typed in part sends neither half", () => {
    const RANGE: DateRangePickerValue = { start: new CalendarDateTime(2026, 10, 14, 10, 0), end: new CalendarDateTime(2026, 10, 18, 10, 0) };
    const { container } = inLocale(
      <NativeForm>
        <DateRangePicker label="Trip dates" granularity="hour" startName="start" endName="end" defaultValue={RANGE} />
      </NativeForm>,
    );
    expect(submit(container)).toEqual({ start: "2026-10-14T10:00:00", end: "2026-10-18T10:00:00" });
    clear(segment(container, "minute", 1));
    expect(submit(container)).toEqual({ start: "", end: "" });
  });

  it("TimeField: a time typed in part sends nothing; a complete one is sent", () => {
    const { container } = inLocale(
      <NativeForm>
        <TimeField label="Meeting time" name="meeting" defaultValue={new Time(10, 30)} />
      </NativeForm>,
    );
    expect(submit(container)).toEqual({ meeting: "10:30:00" });
    clear(segment(container, "minute"));
    expect(submit(container)).toEqual({ meeting: "" });
    type(segment(container, "minute"), "45");
    expect(submit(container)).toEqual({ meeting: "10:45:00" });
  });
});
