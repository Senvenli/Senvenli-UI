import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarDate, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimeValue } from "react-aria-components";

import { DesignSystemProvider } from "../provider";
import { DateField, DatePicker, DateRangeField, TimeField, type DateRangeFieldValue } from "./index";

/**
 * Clearing a field the user left typed in part. Its value is already null (the field reported it),
 * so an app that sets null changes nothing and the typed parts stay. The supported way is a new `key`: React remounts
 * the field, empty (or at the value or defaultValue given).
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en-GB" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function segment(root: ParentNode, kind: string) {
  return root.querySelector<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`)!;
}
function segments(root: ParentNode, kind: string) {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`));
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

describe("clearing a field typed in part: a new key", () => {
  it("DateField, controlled: null alone keeps the parts; null with a new key empties the field", () => {
    const seen: (string | null)[] = [];
    function App() {
      const [value, setValue] = React.useState<CalendarDate | null>(new CalendarDate(2026, 10, 31));
      const [key, setKey] = React.useState(0);
      return (
        <>
          <DateField key={key} label="Expiry date" value={value} onChange={(next) => { seen.push(next?.toString() ?? null); setValue(next); }} />
          <button type="button" onClick={() => setValue(null)}>null</button>
          <button type="button" onClick={() => { setValue(null); setKey((k) => k + 1); }}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    clear(segment(container, "month"));
    blur();
    expect(seen).toEqual(["2026-01-31", null]);
    expect(shown(container)).toEqual(["31", "/", "mm", "/", "2026"]);
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "null" }));
    expect(shown(container)).toEqual(["31", "/", "mm", "/", "2026"]);

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["dd", "/", "mm", "/", "yyyy"]);
    expect(screen.queryByText("Incomplete date: enter the month, or clear the field.")).toBeNull();
    expect(invalid(container)).toBe(false);
    expect(seen).toEqual(["2026-01-31", null]);

    // The remounted field works as a new one: a date typed in it is reported as React Aria reports it, year digit by digit.
    type(segment(container, "day"), "05");
    type(segment(container, "month"), "03");
    type(segment(container, "year"), "2027");
    expect(seen).toEqual(["2026-01-31", null, "0002-03-05", "0020-03-05", "0202-03-05", "2027-03-05"]);
  });

  it("DateField, uncontrolled: a new key goes back to the defaultValue given", () => {
    const onChange = vi.fn();
    function App() {
      const [key, setKey] = React.useState(0);
      return (
        <>
          <DateField key={key} label="Season start" hideYear defaultValue={null} onChange={onChange} />
          <button type="button" onClick={() => setKey((k) => k + 1)}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    type(segment(container, "day"), "14");
    blur();
    expect(shown(container)).toEqual(["14", "/", "mm"]);
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["dd", "/", "mm"]);
    expect(screen.queryByText("Incomplete date: enter the month, or clear the field.")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("an impossible date (31.11) clears the same way", () => {
    function App() {
      const [value, setValue] = React.useState<CalendarDate | null>(new CalendarDate(2026, 10, 31));
      const [key, setKey] = React.useState(0);
      return (
        <>
          <DateField key={key} label="Expiry date" value={value} onChange={setValue} />
          <button type="button" onClick={() => { setValue(null); setKey((k) => k + 1); }}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "11");
    blur();
    expect(screen.getByText("November has 30 days.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["dd", "/", "mm", "/", "yyyy"]);
    expect(screen.queryByText("November has 30 days.")).toBeNull();
  });

  it("TimeField: a new key empties \"10:––\"", () => {
    function App() {
      const [value, setValue] = React.useState<TimeValue | null>(new Time(10, 30));
      const [key, setKey] = React.useState(0);
      return (
        <>
          <TimeField key={key} label="Meeting time" value={value} onChange={setValue} />
          <button type="button" onClick={() => { setValue(null); setKey((k) => k + 1); }}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    clear(segment(container, "minute"));
    blur();
    expect(shown(container)).toEqual(["10", ":", "––"]);
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["––", ":", "––"]);
    expect(screen.queryByText("Incomplete time: enter the minutes, or clear the field.")).toBeNull();
  });

  it("DateRangeField: null alone keeps a half typed in part; null with a new key empties both halves", () => {
    const seen: (string | null)[] = [];
    function App() {
      const [value, setValue] = React.useState<DateRangeFieldValue | null>({ start: new CalendarDate(2026, 10, 1), end: new CalendarDate(2026, 10, 5) });
      const [key, setKey] = React.useState(0);
      return (
        <>
          <DateRangeField key={key} label="Trip dates" value={value} onChange={(next) => { seen.push(next ? `${next.start}/${next.end}` : null); setValue(next); }} />
          <button type="button" onClick={() => setValue(null)}>null</button>
          <button type="button" onClick={() => { setValue(null); setKey((k) => k + 1); }}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    clear(segments(container, "month")[1]!);
    blur();
    expect(seen).toEqual(["2026-10-01/2026-01-05", null]);
    expect(shown(container)).toEqual(["01", "/", "10", "/", "2026", "05", "/", "mm", "/", "2026"]);
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "null" }));
    expect(shown(container)).toEqual(["01", "/", "10", "/", "2026", "05", "/", "mm", "/", "2026"]);

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["dd", "/", "mm", "/", "yyyy", "dd", "/", "mm", "/", "yyyy"]);
    expect(screen.queryByText("Incomplete date: enter the month, or clear the field.")).toBeNull();
    expect(invalid(container)).toBe(false);
    expect(seen).toEqual(["2026-10-01/2026-01-05", null]);
  });

  it("DatePicker: null alone keeps the parts; null with a new key empties the field", () => {
    const seen: (string | null)[] = [];
    function App() {
      const [value, setValue] = React.useState<CalendarDate | null>(new CalendarDate(2026, 10, 31));
      const [key, setKey] = React.useState(0);
      return (
        <>
          <DatePicker key={key} label="Due date" value={value} onChange={(next) => { seen.push(next?.toString() ?? null); setValue(next); }} />
          <button type="button" onClick={() => setValue(null)}>null</button>
          <button type="button" onClick={() => { setValue(null); setKey((k) => k + 1); }}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    clear(segment(container, "month"));
    blur();
    expect(seen).toEqual(["2026-01-31", null]);
    expect(shown(container)).toEqual(["31", "/", "mm", "/", "2026"]);
    expect(screen.getByText("Incomplete date: enter the month, or clear the field.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "null" }));
    expect(shown(container)).toEqual(["31", "/", "mm", "/", "2026"]);

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["dd", "/", "mm", "/", "yyyy"]);
    expect(screen.queryByText("Incomplete date: enter the month, or clear the field.")).toBeNull();
    expect(invalid(container)).toBe(false);
    expect(seen).toEqual(["2026-01-31", null]);
  });

  it("DatePicker, uncontrolled: a new key goes back to the defaultValue given", () => {
    const onChange = vi.fn();
    function App() {
      const [key, setKey] = React.useState(0);
      return (
        <>
          <DatePicker key={key} label="Due date" defaultValue={new CalendarDate(2026, 10, 31)} onChange={onChange} />
          <button type="button" onClick={() => setKey((k) => k + 1)}>reset</button>
        </>
      );
    }
    const { container } = inLocale(<App />);
    clear(segment(container, "day"));
    blur();
    expect(shown(container)).toEqual(["dd", "/", "10", "/", "2026"]);
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(shown(container)).toEqual(["31", "/", "10", "/", "2026"]);
    expect(screen.queryByText("Incomplete date: enter the day, or clear the field.")).toBeNull();
    // Backspaced digit by digit: "3" is the 3rd, then the day is empty; the reset itself reports nothing.
    expect(onChange.mock.calls.map(([value]) => value?.toString() ?? null)).toEqual(["2026-10-03", null]);
  });
});
