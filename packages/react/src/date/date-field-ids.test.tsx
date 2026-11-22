import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { CalendarDate, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Calendar, DateField, DatePicker, DateRangePicker, RangeCalendar, TimeField } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function inLocale(ui: React.ReactElement, locale = "en-GB") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** Every id that more than one element in `root` carries. */
function duplicateIds(root: ParentNode) {
  const counts = new Map<string, number>();
  for (const element of root.querySelectorAll("[id]")) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
}

const REFERENCES = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-errormessage", "aria-activedescendant"];
/** References to ids no element in the document has. */
function danglingReferences(root: ParentNode) {
  return [...root.querySelectorAll("*")].flatMap((element) =>
    REFERENCES.flatMap((name) => (element.getAttribute(name) ?? "").split(/\s+/).filter((ref) => ref && !document.getElementById(ref)).map((ref) => `${name}=${ref}`)),
  );
}

const FIELDS: Array<[string, (id?: string) => React.ReactElement]> = [
  ["DateField", (id) => <DateField id={id} label="Birth date" description="As on your ID." />],
  ["DateField month", (id) => <DateField id={id} label="Expiry" granularity="month" description="As printed on the card." />],
  ["DateField month–day", (id) => <DateField id={id} label="Anniversary" hideYear description="Every year." />],
  ["DateField invalid", (id) => <DateField id={id} label="Birth date" isInvalid errorMessage="A date is required." />],
  ["TimeField", (id) => <TimeField id={id} label="Start time" description="In local time." defaultValue={new Time(10, 30)} />],
  ["TimeField invalid", (id) => <TimeField id={id} label="Start time" isInvalid errorMessage="A time is required." />],
];

describe("DateField and TimeField: every id once", () => {
  for (const locale of ["en-GB", "ar-AE"]) {
    for (const [kind, field] of FIELDS) {
      for (const id of [undefined, "app-id"]) {
        it(`${kind} in ${locale}, ${id ? "with" : "without"} an id: unique ids, one named group, the wiring as before`, () => {
          const { container } = inLocale(field(id), locale);
          expect(duplicateIds(document)).toEqual([]);
          expect(danglingReferences(container)).toEqual([]);
          // One group: the segments' DateInput, React Aria's field group, named by the label and described by the
          // field's description or error, as before.
          const groups = container.querySelectorAll("[role='group']");
          expect(groups).toHaveLength(1);
          const group = groups[0] as HTMLElement;
          expect(group.getAttribute("data-slot")).toBe("date-input");
          expect(group.id).not.toBe("");
          const label = container.querySelector<HTMLElement>("[data-slot='field-label']")!;
          expect(group.getAttribute("aria-labelledby")).toBe(label.id);
          const describedBy = (group.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
          const shown = container.querySelector("[data-slot='field-description'], [data-slot='field-error']")!;
          expect(describedBy).toContain(shown.id);
          // The frame around it is presentational: no id, no name of its own, the same bidi isolation.
          const frame = container.querySelector<HTMLElement>("[data-slot='input-group']")!;
          expect(frame.getAttribute("role")).toBe("presentation");
          expect(frame.hasAttribute("id")).toBe(false);
          expect(frame.hasAttribute("aria-labelledby")).toBe(false);
          expect(frame.hasAttribute("aria-describedby")).toBe(false);
          expect(frame.style.unicodeBidi).toBe("isolate");
          // Each segment is still named by the field's label.
          for (const segment of container.querySelectorAll("[role='spinbutton']")) {
            expect((segment.getAttribute("aria-labelledby") ?? "").split(" ")).toContain(label.id);
          }
          // The app's id still names the first typed segment only.
          if (id) {
            const target = document.getElementById(id)!;
            expect(target.getAttribute("role")).toBe("spinbutton");
            act(() => target.focus());
            expect(document.activeElement).toBe(target);
          }
        });
      }
    }
  }

  it("the keyboard moves between segments and steps them, as before", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField id="d" label="Date" defaultValue={new CalendarDate(2026, 10, 14)} onChange={onChange} />);
    const [day, month] = [...container.querySelectorAll<HTMLElement>("[role='spinbutton']")];
    act(() => day!.focus());
    fireEvent.keyDown(day!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(month);
    fireEvent.keyDown(month!, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2026, 11, 14));
    fireEvent.keyDown(month!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(day);
  });

  it("RTL (ar-AE): the arrows still step the segment in focus (moving between segments is checked in Chromium)", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<TimeField label="الوقت" defaultValue={new Time(10, 30)} onChange={onChange} />, "ar-AE");
    const hour = container.querySelector<HTMLElement>("[role='spinbutton']")!;
    act(() => hour.focus());
    fireEvent.keyDown(hour, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(new Time(11, 30));
    expect(document.activeElement).toBe(hour);
  });

  it("onBlur runs once when focus leaves the field, not as it moves between segments", () => {
    const onBlur = vi.fn();
    const { container } = inLocale(
      <>
        <TimeField label="Time" onBlur={onBlur} />
        <button type="button">next</button>
      </>,
    );
    const [hour, minute] = [...container.querySelectorAll<HTMLElement>("[role='spinbutton']")];
    act(() => hour!.focus());
    act(() => minute!.focus());
    expect(onBlur).not.toHaveBeenCalled();
    act(() => container.querySelector("button")!.focus());
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("a press on the label focuses the first segment", () => {
    const { container } = inLocale(<DateField label="Date" />);
    fireEvent.click(container.querySelector("[data-slot='field-label']")!);
    expect(document.activeElement).toBe(container.querySelector("[role='spinbutton']"));
  });

  it("the server renders unique ids, and hydration matches", async () => {
    const ui = (
      <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
        <DateField label="Birth date" />
        <DateField id="ssr-date" label="Birth date" />
        <TimeField label="Start time" />
        <TimeField id="ssr-time" label="Start time" />
      </DesignSystemProvider>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(ui);
    expect(duplicateIds(host)).toEqual([]);
    expect(host.querySelectorAll("[role='group']")).toHaveLength(4);
    document.body.append(host);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(host, ui);
    });
    expect(errors.mock.calls.filter((call) => /hydrat|did not match/i.test(String(call[0])))).toEqual([]);
    expect(duplicateIds(document)).toEqual([]);
    expect(document.getElementById("ssr-time")!.getAttribute("data-type")).toBe("hour");
    act(() => root?.unmount());
    host.remove();
  });

  it("the other date components already have every id once (DatePicker, DateRangePicker, calendars)", () => {
    inLocale(
      <>
        <DatePicker label="Start date" />
        <DatePicker id="p" label="Month" granularity="month" />
        <DateRangePicker label="Trip dates" />
        <DateRangePicker id="r" label="Trip dates" />
        <Calendar aria-label="Calendar" />
        <RangeCalendar aria-label="Range" />
      </>,
    );
    expect(duplicateIds(document)).toEqual([]);
  });
});
