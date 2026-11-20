import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarDate, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Form } from "../form/index";
import { DateField, DatePicker, DateRangeField, TimeField } from "./index";

/**
 * A Form's reset under validationBehavior "native". After a blocked submit, a programmatic `form.reset()` (outside a
 * user event: after an `await`, in a timer) put the value back, but React Aria passes such a reset over, so
 * "Incomplete date: enter the month, or clear the field." stayed on screen, the field still drawn invalid, until the
 * next interaction. A reset now clears what the date and time fields show, however it comes; a server error the form
 * holds is left to React Aria.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inEnGb(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en-GB" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function segment(root: ParentNode, kind: string, nth = 0) {
  return root.querySelectorAll<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`)[nth]!;
}
function shown(root: ParentNode) {
  return Array.from(root.querySelectorAll("[data-slot='date-segment']"))
    .map((s) => (s.textContent ?? "").replace(/[⁦-⁩]/g, ""))
    .join("");
}
function type(el: HTMLElement, text: string) {
  act(() => el.focus());
  for (const data of text) {
    act(() => {
      (document.activeElement ?? el).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
    });
  }
}
/** Backspace in a segment until it shows its placeholder. */
function clear(el: HTMLElement) {
  act(() => el.focus());
  for (let i = 0; i < 5 && !el.hasAttribute("data-placeholder"); i++) {
    act(() => {
      el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
    });
  }
}
const messages = () => Array.from(document.querySelectorAll("[data-slot='field-error']")).map((row) => row.textContent);
const drawnInvalid = (root: ParentNode) => Array.from(root.querySelectorAll("[data-slot='input-group']")).some((frame) => frame.hasAttribute("data-invalid"));
const markedInvalid = (root: ParentNode) => root.querySelector("[aria-invalid='true']") !== null;
/** A programmatic reset, as an app's code after an `await` makes it: no event is being handled (window.event unset). */
function resetInCode(root: HTMLElement) {
  expect(window.event).toBeUndefined();
  act(() => root.querySelector("form")!.reset());
}

const MONTH_MISSING = "Incomplete date: enter the month, or clear the field.";

type Case = { name: string; field: React.ReactElement; before: string; spoil: (root: HTMLElement) => void; message: string };
const CASES: Case[] = [
  {
    name: "DateField, a date typed in part",
    field: <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />,
    before: "24/03/2026",
    spoil: (root) => clear(segment(root, "month")),
    message: MONTH_MISSING,
  },
  {
    name: "DateField hideYear, an impossible day",
    field: <DateField label="Season start" name="season" hideYear defaultValue={new CalendarDate(2000, 2, 10)} />,
    before: "10/02",
    spoil: (root) => type(segment(root, "day"), "30"),
    message: "February has 29 days.",
  },
  {
    name: "TimeField, a time typed in part",
    field: <TimeField label="Start time" name="start" defaultValue={new Time(10, 30)} />,
    before: "10:30",
    spoil: (root) => clear(segment(root, "minute")),
    message: "Incomplete time: enter the minutes, or clear the field.",
  },
  {
    name: "DatePicker, a date typed in part",
    field: <DatePicker label="Due date" name="due" defaultValue={new CalendarDate(2026, 3, 24)} />,
    before: "24/03/2026",
    spoil: (root) => clear(segment(root, "month")),
    message: MONTH_MISSING,
  },
  {
    name: "DateRangeField, a half typed in part",
    field: (
      <DateRangeField
        label="Trip dates"
        startName="from"
        endName="to"
        defaultValue={{ start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) }}
      />
    ),
    before: "14/10/202618/10/2026",
    spoil: (root) => clear(segment(root, "month", 0)),
    message: MONTH_MISSING,
  },
];

function NativeForm({ children, onSubmit, validationErrors }: { children: React.ReactNode; onSubmit?: () => void; validationErrors?: Record<string, string> }) {
  return (
    <Form
      validationBehavior="native"
      validationErrors={validationErrors}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
      <button type="submit">Save</button>
      <button type="reset">Reset</button>
    </Form>
  );
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

describe("a Form reset under native validation clears the date and time fields' messages", () => {
  for (const { name, field, before, spoil, message } of CASES) {
    it(`${name}: a programmatic form.reset() after a blocked submit`, () => {
      const onSubmit = vi.fn();
      const { container } = inEnGb(<NativeForm onSubmit={onSubmit}>{field}</NativeForm>);
      spoil(container);
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(messages()).toEqual([message]);
      expect(drawnInvalid(container)).toBe(true);

      resetInCode(container);
      expect(shown(container)).toBe(before);
      expect(messages()).toEqual([]);
      expect(drawnInvalid(container)).toBe(false);
      expect(markedInvalid(container)).toBe(false);
      expect(container.querySelector("form")!.checkValidity()).toBe(true);

      // The value given back submits; spoiled again, the next submit is blocked with the message again.
      submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      spoil(container);
      submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(messages()).toEqual([message]);
    });

    it(`${name}: a reset button clears it as before`, () => {
      const { container } = inEnGb(<NativeForm>{field}</NativeForm>);
      spoil(container);
      submit();
      expect(messages()).toEqual([message]);
      fireEvent.click(screen.getByRole("button", { name: "Reset" }));
      expect(shown(container)).toBe(before);
      expect(messages()).toEqual([]);
      expect(drawnInvalid(container)).toBe(false);
    });
  }

  it("a required DateField emptied: the browser's required message clears too", () => {
    const { container } = inEnGb(
      <NativeForm>
        <DateField label="Birthday" name="birth" isRequired defaultValue={new CalendarDate(1990, 5, 1)} />
      </NativeForm>,
    );
    for (const part of ["day", "month", "year"]) clear(segment(container, part));
    submit();
    expect(messages()).toHaveLength(1);
    expect(container.querySelector<HTMLInputElement>("input[name='birth']")!.validity.valueMissing).toBe(true);
    resetInCode(container);
    expect(shown(container)).toBe("01/05/1990");
    expect(messages()).toEqual([]);
    expect(drawnInvalid(container)).toBe(false);
  });

  it("an empty default, still invalid after the reset: cleared as a reset button clears it, and shown at the next submit", () => {
    const { container } = inEnGb(
      <NativeForm>
        <DateField label="Birthday" name="birth" isRequired />
      </NativeForm>,
    );
    submit();
    expect(messages()).toHaveLength(1);
    resetInCode(container);
    expect(messages()).toEqual([]);
    expect(container.querySelector("form")!.checkValidity()).toBe(false);
    submit();
    expect(messages()).toHaveLength(1);
  });

  it("a server error the form holds stays after a programmatic reset, as React Aria keeps it", () => {
    inEnGb(
      <NativeForm validationErrors={{ expiry: "No record for this date." }}>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
      </NativeForm>,
    );
    expect(messages()).toEqual(["No record for this date."]);
    act(() => document.querySelector("form")!.reset());
    expect(messages()).toEqual(["No record for this date."]);
  });

  it("controlled by the app: the reset gives the app the default, and the message clears", () => {
    const seen: (string | null)[] = [];
    function App() {
      const [value, setValue] = React.useState<CalendarDate | null>(new CalendarDate(2026, 3, 24));
      return (
        <NativeForm>
          <DateField label="Expiry date" name="expiry" value={value} defaultValue={new CalendarDate(2026, 3, 24)} onChange={(next) => { seen.push(next?.toString() ?? null); setValue(next); }} />
        </NativeForm>
      );
    }
    const { container } = inEnGb(<App />);
    clear(segment(container, "month"));
    submit();
    expect(messages()).toEqual([MONTH_MISSING]);
    resetInCode(container);
    expect(shown(container)).toBe("24/03/2026");
    expect(messages()).toEqual([]);
    expect(seen.at(-1)).toBe("2026-03-24");
  });

  it("under aria (the Form's default) a programmatic reset clears it, as before", () => {
    const { container } = inEnGb(
      <Form onSubmit={(event) => event.preventDefault()}>
        <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
        <button type="submit">Save</button>
      </Form>,
    );
    clear(segment(container, "month"));
    submit();
    expect(messages()).toEqual([MONTH_MISSING]);
    resetInCode(container);
    expect(messages()).toEqual([]);
  });

  it("in React's Strict Mode the same", () => {
    const { container } = render(
      <React.StrictMode>
        <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
          <NativeForm>
            <DateField label="Expiry date" name="expiry" defaultValue={new CalendarDate(2026, 3, 24)} />
          </NativeForm>
        </DesignSystemProvider>
      </React.StrictMode>,
    );
    clear(segment(container, "month"));
    submit();
    expect(messages()).toEqual([MONTH_MISSING]);
    resetInCode(container);
    expect(messages()).toEqual([]);
    expect(drawnInvalid(container)).toBe(false);
  });
});
