import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DatePicker, type DateRangePreset } from "./index";

afterEach(cleanup);

const PRESETS: DateRangePreset[] = [
  { id: "today", label: "Today", range: (day) => ({ start: day, end: day }) },
  { id: "7d", label: "Last 7 days", range: (day) => ({ start: day.subtract({ days: 6 }), end: day }) },
  { id: "mtd", label: "Month to date", range: (day) => ({ start: day.set({ day: 1 }), end: day }) },
];

function open() {
  act(() => fireEvent.click(screen.getByRole("button", { name: /calendar/i })));
  return screen.getByRole("dialog");
}

function inLocale(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en">{ui}</DesignSystemProvider>);
}

describe("DatePicker range presets", () => {
  it("lists the presets as a named radio group in the popover; none chosen at first", () => {
    inLocale(<DatePicker selectionMode="range" label="Period" presets={PRESETS} />);
    const dialog = open();
    const group = within(dialog).getByRole("radiogroup", { name: "Quick ranges" });
    expect(within(group).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Today", "Last 7 days", "Month to date"]);
    expect(within(group).getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("picking one sets the range from today in the time zone, reports its id and closes the popover", () => {
    const onChange = vi.fn();
    const onPresetChange = vi.fn();
    inLocale(<DatePicker selectionMode="range" label="Period" presets={PRESETS} timeZone="UTC" onChange={onChange} onPresetChange={onPresetChange} />);
    const dialog = open();
    act(() => fireEvent.click(within(dialog).getByRole("radio", { name: "Last 7 days" })));
    const day = today("UTC");
    expect(onPresetChange).toHaveBeenCalledWith("7d");
    const range = onChange.mock.calls.at(-1)![0] as { start: CalendarDate; end: CalendarDate };
    expect(range.start.toString()).toBe(day.subtract({ days: 6 }).toString());
    expect(range.end.toString()).toBe(day.toString());
    expect(screen.queryByRole("dialog")).toBeNull();
    // The field keeps showing dates, and the next opening marks the chosen preset.
    const reopened = open();
    expect(within(reopened).getByRole("radio", { name: "Last 7 days" }).getAttribute("aria-checked")).toBe("true");
  });

  it("dates set by hand clear the preset (null = custom)", () => {
    const onPresetChange = vi.fn();
    const day = today(getLocalTimeZone());
    inLocale(
      <DatePicker
        selectionMode="range"
        label="Period"
        presets={PRESETS}
        defaultPresetId="today"
        defaultValue={{ start: day, end: day }}
        onPresetChange={onPresetChange}
      />,
    );
    const dialog = open();
    expect(within(dialog).getByRole("radio", { name: "Today" }).getAttribute("aria-checked")).toBe("true");
    // Pick a new range in the calendar: two other days.
    const days = within(dialog).getAllByRole("button").filter((button) => /^\d+$/.test(button.textContent ?? "") && !button.hasAttribute("aria-disabled"));
    expect(days.length).toBeGreaterThan(2);
    act(() => fireEvent.click(days[0]!));
    act(() => fireEvent.click(days[2]!));
    expect(onPresetChange).toHaveBeenLastCalledWith(null);
  });

  it("controlled: presetId marks the preset; the app keeps it", () => {
    inLocale(<DatePicker selectionMode="range" label="Period" presets={PRESETS} presetId="mtd" />);
    const dialog = open();
    expect(within(dialog).getByRole("radio", { name: "Month to date" }).getAttribute("aria-checked")).toBe("true");
  });

  it("without presets the popover is as before", () => {
    inLocale(<DatePicker selectionMode="range" label="Period" />);
    const dialog = open();
    expect(within(dialog).queryByRole("radiogroup")).toBeNull();
    expect(dialog.className).toContain("flex-col");
  });
});
