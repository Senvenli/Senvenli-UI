import * as React from "react";
import fs from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarDate, CalendarDateTime } from "@internationalized/date";
import { createTheme } from "@senvenli/tokens";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DatePicker } from "./index";
import { rangeDuration } from "./pickers";

afterEach(cleanup);
const here = (file: string) => new URL(file, import.meta.url);

describe("range band fill", () => {
  it("the band between the ends is one step above `selected`, which in dark matches the popover surface", () => {
    const source = fs.readFileSync(here("./calendar.tsx"), "utf8");
    expect(source).toContain('"rounded-none bg-ds-background-selected-hovered data-[hovered]:bg-ds-background-selected-pressed"');
    // Why: dark `selected` is within 0.01 lightness of the overlay surface; the band's token is clearly apart from it.
    const dark = createTheme().dark as Record<string, { l: number } | string>;
    const l = (key: string) => (dark[key] as { l: number }).l;
    expect(Math.abs(l("ds-background-selected") - l("ds-surface-overlay"))).toBeLessThan(0.01);
    expect(l("ds-background-selected-hovered") - l("ds-surface-overlay")).toBeGreaterThan(0.03);
  });
});

describe("dayCount", () => {
  it("elapsed (default) counts the days between; inclusive counts both ends; times stay 24-hour blocks", () => {
    expect(rangeDuration(new CalendarDate(2026, 11, 21), new CalendarDate(2026, 11, 27))).toEqual({ days: 6 });
    expect(rangeDuration(new CalendarDate(2026, 11, 21), new CalendarDate(2026, 11, 27), "inclusive")).toEqual({ days: 7 });
    expect(rangeDuration(new CalendarDate(2026, 11, 27), new CalendarDate(2026, 11, 27), "inclusive")).toEqual({ days: 1 });
    expect(rangeDuration(new CalendarDateTime(2026, 10, 14, 10, 0), new CalendarDateTime(2026, 10, 18, 10, 0), "inclusive")).toEqual({ days: 4, hours: 96 });
  });

  it("a report period reads 7 days for 21–27 November", () => {
    render(
      <DesignSystemProvider locale="en">
        <DatePicker selectionMode="range" label="Period" dayCount="inclusive" defaultValue={{ start: new CalendarDate(2026, 11, 21), end: new CalendarDate(2026, 11, 27) }} />
      </DesignSystemProvider>,
    );
    act(() => fireEvent.click(screen.getByRole("button", { name: /calendar/i })));
    expect(screen.getByRole("dialog").querySelector("[data-slot='date-range-duration']")?.textContent).toBe("7 days");
  });
});
