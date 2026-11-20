import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { CalendarDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { Calendar, RangeCalendar } from "./index";

afterEach(cleanup);

// German words for the two month buttons, so a de-DE provider differs from English in the tests below.
registerDsStrings("de", { previousMonth: "Vorheriger Monat", nextMonth: "Folgemonat" });

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

function inLocale(ui: React.ReactElement, locale = "en-GB", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const OCT_14 = new CalendarDate(2026, 10, 14);

/** The cell whose own date matches: a range end's label starts with the whole range, so only its last date counts. */
function dayCell(container: HTMLElement, label: RegExp) {
  return within(container).getAllByRole("button").find((b) => {
    const dates = (b.getAttribute("aria-label") ?? "").match(/\d{1,2} \S+ \d{4}/g);
    return !!dates && label.test(dates[dates.length - 1]!);
  }) as HTMLElement;
}

/** What a screen reader hears after the name: the text of every node the button's aria-describedby points to. */
function description(button: HTMLElement) {
  return (button.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

function weekdays(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-slot='calendar-weekday']")).slice(0, 7).map((th) => th.textContent);
}

describe("Calendar", () => {
  it.each([
    ["en-GB", "October 2026", "Mon"],
    ["en-US", "October 2026", "Sun"],
    ["de-DE", "Oktober 2026", "Mo"],
  ])("%s: month, weekday names and first day of week come from Intl", (locale, month, first) => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} />, locale);
    expect(container.querySelector("[data-slot='calendar-title']")?.textContent?.toLowerCase()).toBe(month.toLowerCase());
    expect(weekdays(container)[0]?.toLowerCase()).toContain(first.toLowerCase().slice(0, 2));
  });

  it("Arabic gets narrow weekday names: Intl's short ones are whole words that overrun the columns", () => {
    const { container } = inLocale(<Calendar aria-label="التاريخ" defaultValue={OCT_14} />, "ar", "rtl");
    for (const name of weekdays(container)) expect(name!.length).toBeLessThanOrEqual(2);
  });

  it("firstDayOfWeek overrides the locale", () => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} firstDayOfWeek="sun" />, "en-GB");
    expect(weekdays(container)[0]).toBe("Sun");
  });

  it("locale prop overrides the provider", () => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} locale="en-US" />, "de-DE");
    expect(container.querySelector("[data-slot='calendar-title']")?.textContent).toBe("October 2026");
    expect(screen.getByRole("button", { name: "Next month" })).toBeTruthy();
  });

  it("previous/next buttons are named in the locale and move the month", () => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} />);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(container.querySelector("[data-slot='calendar-title']")?.textContent).toBe("November 2026");
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(container.querySelector("[data-slot='calendar-title']")?.textContent).toBe("September 2026");
  });

  it("previous/next names come from registerDsStrings; a locale without strings reads English", () => {
    expect(DS_STRINGS.previousMonth.en).toBe("Previous month");
    expect(DS_STRINGS.nextMonth.en).toBe("Next month");
    inLocale(<Calendar aria-label="Datum" defaultValue={OCT_14} />, "de-DE");
    expect(screen.getByRole("button", { name: "Vorheriger Monat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Folgemonat" })).toBeTruthy();
    cleanup();
    inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} />, "nl");
    expect(screen.getByRole("button", { name: "Previous month" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next month" })).toBeTruthy();
  });

  it("keyboard: arrows by day, Page Down by month, picks with Enter", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} onChange={onChange} />);
    const selected = dayCell(container, /14 October 2026/);
    act(() => selected.focus());
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/15 October 2026/);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/22 October 2026/);
    fireEvent.keyDown(document.activeElement!, { key: "PageDown" });
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/22 November 2026/);
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    fireEvent.keyUp(document.activeElement!, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2026, 11, 22));
  });

  it("an unavailable day stays focusable, is struck through and says why", () => {
    const sunday = (d: CalendarDate) => d.toDate("UTC").getUTCDay() === 0;
    const { container } = inLocale(
      <Calendar aria-label="Date" defaultValue={OCT_14} isDateUnavailable={sunday} unavailableReason={() => "Closed"} />,
    );
    const day = dayCell(container, /18 October 2026/);
    expect(day.getAttribute("aria-disabled")).toBe("true");
    expect(description(day)).toBe("Closed");
    // aria-label names the button; text inside it would be hidden from screen readers.
    expect(day.getAttribute("aria-label")).not.toContain("Closed");
    expect(day.hasAttribute("data-unavailable")).toBe(true);
    expect(day.className).toContain("line-through");
    expect(dayCell(container, /19 October 2026/).className).not.toContain("line-through");
  });

  it("markers draw a dot and a string is heard with the day", () => {
    const { container } = inLocale(
      <Calendar aria-label="Date" defaultValue={OCT_14} getDateMarkers={(d) => (d.day === 20 ? "3 events" : d.day === 21)} />,
    );
    expect(dayCell(container, /20 October 2026/).querySelector("[data-slot='calendar-marker']")).toBeTruthy();
    expect(description(dayCell(container, /20 October 2026/))).toBe("3 events");
    expect(description(dayCell(container, /21 October 2026/))).toBe("");
    expect(dayCell(container, /21 October 2026/).querySelector("[data-slot='calendar-marker']")).toBeTruthy();
    expect(dayCell(container, /22 October 2026/).querySelector("[data-slot='calendar-marker']")).toBeNull();
  });

  it("the note survives re-renders and moves with the selection", () => {
    const { container } = inLocale(
      <Calendar aria-label="Date" defaultValue={OCT_14} getDateMarkers={(d) => (d.day === 20 ? "3 events" : undefined)} />,
    );
    fireEvent.click(dayCell(container, /20 October 2026/));
    fireEvent.click(dayCell(container, /22 October 2026/));
    expect(description(dayCell(container, /20 October 2026/))).toBe("3 events");
    expect(description(dayCell(container, /22 October 2026/))).toBe("");
  });

  it("the month title is not read twice: React Aria's heading names it", () => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} />);
    expect(container.querySelector("[data-slot='calendar-title']")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("today is underlined in the given time zone, and only after mount", () => {
    const { container } = inLocale(<Calendar aria-label="Date" timeZone="Europe/Berlin" />);
    const underlined = Array.from(container.querySelectorAll("[data-slot='calendar-day']")).filter((c) => c.className.includes("underline-offset-3"));
    expect(underlined).toHaveLength(1);
  });

  it("the server renders no today underline (the browser's clock decides it after mount)", () => {
    const html = renderToString(
      <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
        <Calendar aria-label="Date" timeZone="Europe/Berlin" />
      </DesignSystemProvider>,
    );
    expect(html).not.toContain("underline-offset-3");
  });

  it("minValue disables earlier days", () => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} minValue={new CalendarDate(2026, 10, 10)} />);
    expect(dayCell(container, /9 October 2026/).getAttribute("aria-disabled")).toBe("true");
    expect(dayCell(container, /10 October 2026/).getAttribute("aria-disabled")).toBeNull();
  });

  it("RTL: no physical classes, chevrons mirror", () => {
    const { container } = inLocale(<Calendar aria-label="Date" defaultValue={OCT_14} visibleMonths={2} getDateMarkers={() => true} />, "ar", "rtl");
    for (const el of Array.from(container.querySelectorAll("[class]"))) expect(el.getAttribute("class")).not.toMatch(PHYSICAL);
    expect(container.querySelector("[data-slot='calendar-previous'] svg")?.getAttribute("class")).toContain("rtl:-scale-x-100");
  });
});

// Two months re-render on every click; under a full parallel run one test can take several seconds.
describe("RangeCalendar", { timeout: 15_000 }, () => {
  const range = { start: new CalendarDate(2026, 10, 14), end: new CalendarDate(2026, 10, 18) };

  it("shows two months, prev on the first, next on the last", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} />);
    expect(Array.from(container.querySelectorAll("[data-slot='calendar-title']")).map((t) => t.textContent)).toEqual(["October 2026", "November 2026"]);
    expect(screen.getAllByRole("button", { name: "Previous month" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Next month" })).toHaveLength(1);
  });

  it("the band is square and joins both ends", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} />);
    const start = dayCell(container, /14 October 2026/);
    const mid = dayCell(container, /16 October 2026/);
    const end = dayCell(container, /18 October 2026/);
    expect(start.className).toContain("bg-ds-background-brand-bold");
    expect(start.className).toContain("rounded-e-none");
    expect(start.className).not.toContain("rounded-s-none");
    expect(end.className).toContain("rounded-s-none");
    expect(end.className).not.toContain("rounded-e-none");
    expect(mid.className).toContain("rounded-none");
    expect(mid.className).toContain("bg-ds-background-selected");
    expect(mid.className).not.toContain("brand-bold");
  });

  it("a one-day range is rounded on both sides", () => {
    const one = { start: OCT_14, end: OCT_14 };
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={one} />);
    const cell = dayCell(container, /14 October 2026/);
    expect(cell.className).toContain("bg-ds-background-brand-bold");
    expect(cell.className).not.toMatch(/rounded-[se]-none/);
  });

  it("picks start then end and reports the range; the footer follows the pick and counts the days", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} onChange={onChange} action={<button>Apply</button>} />);
    const summary = () => container.querySelector("[data-slot='range-calendar-summary']")?.textContent;
    expect(summary()).toBe("14 Oct – 18 Oct · 4 days");
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(summary()).toBe("20 Oct – …");
    fireEvent.click(dayCell(container, /3 November 2026/));
    expect(onChange).toHaveBeenLastCalledWith({ start: new CalendarDate(2026, 10, 20), end: new CalendarDate(2026, 11, 3) });
    expect(summary()).toBe("20 Oct – 3 Nov · 14 days");
  });

  it("controlled: a parent that keeps its value keeps the band where it was", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" value={range} onChange={onChange} />);
    fireEvent.click(dayCell(container, /20 October 2026/));
    fireEvent.click(dayCell(container, /22 October 2026/));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(dayCell(container, /16 October 2026/).className).toContain("bg-ds-background-selected");
    expect(dayCell(container, /21 October 2026/).className).not.toContain("bg-ds-background-selected");
  });

  it("hovering after the start previews the range", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} />);
    fireEvent.click(dayCell(container, /20 October 2026/));
    fireEvent.pointerEnter(dayCell(container, /23 October 2026/), { pointerType: "mouse" });
    expect(dayCell(container, /22 October 2026/).className).toContain("bg-ds-background-selected");
    expect(dayCell(container, /23 October 2026/).className).toContain("bg-ds-background-brand-bold");
  });

  it("maxDuration makes days too far from the start unavailable while picking the end", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} maxDuration={3} />);
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(dayCell(container, /23 October 2026/).getAttribute("aria-disabled")).toBeNull();
    expect(dayCell(container, /24 October 2026/).getAttribute("aria-disabled")).toBe("true");
  });

  it("minDuration blocks ends that are too close", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} minDuration={2} />);
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(dayCell(container, /21 October 2026/).getAttribute("aria-disabled")).toBe("true");
    expect(description(dayCell(container, /21 October 2026/))).toBe("Range too short");
    expect(dayCell(container, /22 October 2026/).getAttribute("aria-disabled")).toBeNull();
  });

  it("a range cannot cross an unavailable day: later days close once the start is picked", () => {
    const { container } = inLocale(
      <RangeCalendar aria-label="Trip dates" defaultValue={range} minDuration={1} isDateUnavailable={(d) => d.month === 10 && d.day === 24} />,
    );
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(dayCell(container, /23 October 2026/).getAttribute("aria-disabled")).toBeNull();
    expect(dayCell(container, /25 October 2026/).getAttribute("aria-disabled")).toBe("true");
    expect(description(dayCell(container, /25 October 2026/))).toBe("A closed day is in between");
    expect(dayCell(container, /19 October 2026/).getAttribute("aria-disabled")).toBeNull();
  });

  it("availability that changes mid-pick is obeyed at once (no stale contiguity)", () => {
    const { container, rerender } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} isDateUnavailable={(d) => d.month === 10 && d.day === 28} />);
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(dayCell(container, /25 October 2026/).getAttribute("aria-disabled")).toBeNull();
    rerender(
      <div>
        <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>
          <RangeCalendar aria-label="Trip dates" defaultValue={range} isDateUnavailable={(d) => d.month === 10 && d.day === 22} />
        </DesignSystemProvider>
      </div>,
    );
    expect(dayCell(container, /21 October 2026/).getAttribute("aria-disabled")).toBeNull();
    expect(dayCell(container, /25 October 2026/).getAttribute("aria-disabled")).toBe("true");
  });

  it("days closed by a length limit are dimmed, not struck through like unavailable days", () => {
    const { container } = inLocale(
      <RangeCalendar aria-label="Trip dates" defaultValue={range} maxDuration={3} isDateUnavailable={(d) => d.month === 11 && d.day === 2} unavailableReason={() => "Sold out"} />,
    );
    fireEvent.click(dayCell(container, /20 October 2026/));
    const far = dayCell(container, /28 October 2026/);
    expect(far.getAttribute("aria-disabled")).toBe("true");
    expect(far.hasAttribute("data-out-of-reach")).toBe(true);
    expect(far.className).not.toContain("line-through");
    expect(description(far)).toBe("Range too long");
    const taken = dayCell(container, /2 November 2026/);
    expect(taken.className).toContain("line-through");
    expect(taken.hasAttribute("data-out-of-reach")).toBe(false);
    expect(description(taken)).toBe("Sold out");
  });

  it("allowsNonContiguousRanges lets the end pass an unavailable day", () => {
    const { container } = inLocale(
      <RangeCalendar aria-label="Trip dates" defaultValue={range} allowsNonContiguousRanges isDateUnavailable={(d) => d.month === 10 && d.day === 24} />,
    );
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(dayCell(container, /25 October 2026/).getAttribute("aria-disabled")).toBeNull();
  });

  it("minDuration: picking the start twice is not taken", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} minDuration={1} onChange={onChange} />);
    fireEvent.click(dayCell(container, /20 October 2026/));
    fireEvent.click(dayCell(container, /20 October 2026/));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(dayCell(container, /20 October 2026/));
    fireEvent.click(dayCell(container, /22 October 2026/));
    expect(onChange).toHaveBeenLastCalledWith({ start: new CalendarDate(2026, 10, 20), end: new CalendarDate(2026, 10, 22) });
  });

  it("a DS Button as the footer action renders and fires (calendar slots do not leak into it)", () => {
    const onPress = vi.fn();
    inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} action={<Button onPress={onPress}>Apply dates</Button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply dates" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("with a time zone and no range, it opens on that zone's month", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" timeZone="Pacific/Kiritimati" />);
    const zoneMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Pacific/Kiritimati" }).format(new Date());
    expect(container.querySelector("[data-slot='calendar-title']")?.textContent).toBe(zoneMonth);
  });

  it("RTL: no physical classes", () => {
    const { container } = inLocale(<RangeCalendar aria-label="Trip dates" defaultValue={range} action={<button>Apply</button>} />, "ar", "rtl");
    for (const el of Array.from(container.querySelectorAll("[class]"))) expect(el.getAttribute("class")).not.toMatch(PHYSICAL);
  });
});
