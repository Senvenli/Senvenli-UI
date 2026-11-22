import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { CalendarDate, Time } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DateField, DatePicker, DateRangePicker, TimeField } from "./index";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en-GB") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** What an app's focus-on-error does with the first invalid field's id. */
function focusById(id: string) {
  const element = document.getElementById(id);
  act(() => element?.focus());
  return element;
}

describe("date and time fields: a focusable id target", () => {
  it("DatePicker: the id is on the first typed segment, so focusing it puts the user in the field", () => {
    const { container } = inLocale(<DatePicker id="editStartDate" label="Start date" />);
    const target = focusById("editStartDate")!;
    expect(target.getAttribute("role")).toBe("spinbutton");
    expect(target.getAttribute("data-type")).toBe("day");
    expect(document.activeElement).toBe(target);
    // The id names one element only, and the group keeps a name and an id of its own.
    expect(container.querySelectorAll("#editStartDate")).toHaveLength(1);
    const group = container.querySelector<HTMLElement>("[role='group']")!;
    expect(group.id).not.toBe("editStartDate");
    expect(group.id).not.toBe("");
    const label = container.querySelector<HTMLElement>("[data-slot='field-label']")!;
    expect(group.getAttribute("aria-labelledby")).toBe(label.id);
    // The segment is still named by the field's label (React Aria's wiring is unchanged).
    expect(target.getAttribute("aria-labelledby")).toContain(label.id);
  });

  it("DatePicker: from the focused segment the keyboard works as usual (arrows step, Tab moves on)", () => {
    const onChange = vi.fn();
    inLocale(<DatePicker id="d" label="Start date" defaultValue={new CalendarDate(2026, 10, 14)} onChange={onChange} />);
    const day = focusById("d")!;
    fireEvent.keyDown(day, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2026, 10, 15));
    expect(document.activeElement).toBe(day);
  });

  it("TimeField: the id is on the hour, the field's first segment", () => {
    inLocale(<TimeField id="editStartTime" label="Start time" defaultValue={new Time(10, 30)} />);
    const target = focusById("editStartTime")!;
    expect(target.getAttribute("role")).toBe("spinbutton");
    expect(target.getAttribute("data-type")).toBe("hour");
    expect(document.activeElement).toBe(target);
  });

  it("DateField: the first segment shown, also when a segment is hidden (month, month–day)", () => {
    inLocale(<DateField id="birth" label="Birth date" />);
    expect(focusById("birth")!.getAttribute("data-type")).toBe("day");
    cleanup();
    inLocale(<DateField id="expiry" label="Expiry" granularity="month" />);
    const month = focusById("expiry")!;
    expect(month.getAttribute("data-type")).toBe("month");
    expect(document.activeElement).toBe(month);
    cleanup();
    inLocale(<DatePicker id="report" label="Month" granularity="month" />);
    expect(focusById("report")!.getAttribute("data-type")).toBe("month");
    cleanup();
    inLocale(<DateField id="yearly" label="Anniversary" hideYear />);
    expect(focusById("yearly")!.getAttribute("data-type")).toBe("day");
  });

  it("DateField in en-US: the locale's first part (the month) takes the id", () => {
    inLocale(<DateField id="birth" label="Birth date" />, "en-US");
    expect(focusById("birth")!.getAttribute("data-type")).toBe("month");
  });

  it("DateRangePicker: the start half's first segment takes the id", () => {
    const { container } = inLocale(<DateRangePicker id="trip" label="Trip dates" />);
    const target = focusById("trip")!;
    expect(target.getAttribute("role")).toBe("spinbutton");
    expect(container.querySelector("[data-slot='date-range-start']")!.contains(target)).toBe(true);
    expect(document.activeElement).toBe(target);
  });

  it("RTL: the id stays on the first typed segment and focusing it works", () => {
    inLocale(<DatePicker id="d" label="التاريخ" />, "ar-AE");
    const target = focusById("d")!;
    expect(target.getAttribute("role")).toBe("spinbutton");
    expect(document.activeElement).toBe(target);
  });

  it("without an id no segment gets one of the app's (each keeps React Aria's own)", () => {
    const { container } = inLocale(<DatePicker label="Start date" />);
    const ids = [...container.querySelectorAll("[role='spinbutton']")].map((segment) => segment.id);
    expect(ids.every((id) => id.startsWith("react-aria"))).toBe(true);
  });

  it("the server renders the id on the same segment, so hydration matches", async () => {
    const ui = (
      <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
        <DatePicker id="ssr-date" label="Start date" />
        <TimeField id="ssr-time" label="Start time" />
      </DesignSystemProvider>
    );
    const html = renderToString(ui);
    const host = document.createElement("div");
    host.innerHTML = html;
    expect(host.querySelector("#ssr-date")!.getAttribute("role")).toBe("spinbutton");
    expect(host.querySelector("#ssr-time")!.getAttribute("data-type")).toBe("hour");
    document.body.append(host);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(host, ui);
    });
    expect(errors.mock.calls.filter((call) => /hydrat|did not match/i.test(String(call[0])))).toEqual([]);
    errors.mockRestore();
    expect(document.getElementById("ssr-date")!.getAttribute("role")).toBe("spinbutton");
    act(() => root?.unmount());
    host.remove();
  });
});

const ID_REFERENCES = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-details", "aria-errormessage", "aria-flowto", "aria-activedescendant"];

/** Every id an element points to through an ARIA reference, with whether it names an element in the document. */
function references(element: Element) {
  return ID_REFERENCES.flatMap((name) =>
    (element.getAttribute(name) ?? "").split(/\s+/).filter(Boolean).map((ref) => ({ name, ref, found: document.getElementById(ref) !== null })),
  );
}

/** The accessible name from aria-labelledby (accname 2B): a reference to itself reads its own aria-label. */
function nameOf(element: Element) {
  const ids = (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  if (!ids.length) return element.getAttribute("aria-label") ?? "";
  return ids
    .map((ref) => {
      const named = document.getElementById(ref);
      if (!named) return "";
      return named === element ? (element.getAttribute("aria-label") ?? "") : (named.textContent ?? "");
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function segmentName(locale: string, type: string) {
  return new Intl.DisplayNames(locale, { type: "dateTimeField" }).of(type)!;
}

describe("date and time fields: the id target keeps its spoken name", () => {
  const LOCALES = ["de-DE", "ar-AE", "en-US", "ja-JP", "he-IL"];
  const LABEL = "Start date";
  const FIELDS: Array<[string, (id: string) => React.ReactElement]> = [
    ["DatePicker", (id) => <DatePicker id={id} label={LABEL} />],
    ["DatePicker month", (id) => <DatePicker id={id} label={LABEL} granularity="month" />],
    ["DateField", (id) => <DateField id={id} label={LABEL} />],
    ["DateField month", (id) => <DateField id={id} label={LABEL} granularity="month" />],
    ["DateField month–day", (id) => <DateField id={id} label={LABEL} hideYear />],
    ["TimeField", (id) => <TimeField id={id} label={LABEL} defaultValue={new Time(10, 30)} />],
    ["DateRangePicker", (id) => <DateRangePicker id={id} label={LABEL} />],
  ];

  for (const locale of LOCALES) {
    for (const [kind, field] of FIELDS) {
      it(`${kind} in ${locale}: every reference on every segment resolves, and the target is named "<segment>, <label>"`, () => {
        const { container } = inLocale(field("target"), locale);
        const segments = [...container.querySelectorAll("[data-slot='date-segment']")];
        expect(segments.length).toBeGreaterThan(0);
        for (const segment of segments) {
          expect(references(segment).filter((reference) => !reference.found)).toEqual([]);
        }
        const target = document.getElementById("target")!;
        const type = target.getAttribute("data-type")!;
        const name = nameOf(target);
        expect(name.startsWith(segmentName(locale, type))).toBe(true);
        expect(name).toContain(LABEL);
        // The target is named like its sibling segments, which keep React Aria's own ids.
        const sibling = segments.find((segment) => segment !== target && segment.getAttribute("role") === "spinbutton");
        if (sibling) expect(nameOf(sibling).startsWith(segmentName(locale, sibling.getAttribute("data-type")!))).toBe(true);
      });
    }
  }

  it("an invalid field: the describedby on every segment resolves and the target keeps its name", () => {
    const { container } = inLocale(<DatePicker id="target" label={LABEL} isInvalid errorMessage="A date is required." />);
    for (const segment of container.querySelectorAll("[data-slot='date-segment']")) {
      expect(references(segment).filter((reference) => !reference.found)).toEqual([]);
    }
    expect(nameOf(document.getElementById("target")!).startsWith(segmentName("en-GB", "day"))).toBe(true);
  });

  it("after hydration the references still resolve and the name is the same as on the client", async () => {
    const ui = (
      <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
        <DatePicker id="ssr-date" label={LABEL} />
        <DateRangePicker id="ssr-range" label={LABEL} />
      </DesignSystemProvider>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(ui);
    document.body.append(host);
    const serverLabelledBy = host.querySelector("#ssr-date")!.getAttribute("aria-labelledby");
    expect(serverLabelledBy!.split(" ")[0]).toBe("ssr-date");
    // The server HTML already names the target in full, before any script runs. (Its aria-describedby still points
    // at React Aria's slot ids for a description and an error that are not rendered; React Aria drops them on mount.)
    expect(references(host.querySelector("#ssr-date")!).filter((reference) => reference.name === "aria-labelledby" && !reference.found)).toEqual([]);
    expect(nameOf(host.querySelector("#ssr-date")!).startsWith(segmentName("en-GB", "day"))).toBe(true);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(host, ui);
    });
    expect(errors.mock.calls.filter((call) => /hydrat|did not match/i.test(String(call[0])))).toEqual([]);
    errors.mockRestore();
    for (const segment of host.querySelectorAll("[data-slot='date-segment']")) {
      expect(references(segment).filter((reference) => !reference.found)).toEqual([]);
    }
    expect(document.getElementById("ssr-date")!.getAttribute("aria-labelledby")).toBe(serverLabelledBy);
    expect(nameOf(document.getElementById("ssr-range")!).startsWith(segmentName("en-GB", "day"))).toBe(true);
    act(() => root?.unmount());
    host.remove();
  });
});
