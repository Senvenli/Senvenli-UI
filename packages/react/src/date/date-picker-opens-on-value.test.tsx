import * as React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CalendarDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DatePicker } from "./index";

// With a time zone, the calendar in the picker opened on today's month (that zone's), not on the picked date's:
// a 18 March 2026 value opened in November. It now opens on the value's month, and on today's only when empty.

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en-US" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const openHeading = (name: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name }));
  return within(screen.getByRole("dialog")).getByRole("heading").textContent;
};

describe("DatePicker popover opens on the value's month", () => {
  it("with a time zone and a value", () => {
    inLocale(<DatePicker label="Delivery date" defaultValue={new CalendarDate(2030, 3, 18)} timeZone="America/New_York" />);
    expect(openHeading(/Delivery date/)).toBe("March 2030");
  });

  it("with a controlled value", () => {
    inLocale(<DatePicker label="Delivery date" value={new CalendarDate(2031, 7, 2)} timeZone="Europe/Berlin" />);
    expect(openHeading(/Delivery date/)).toBe("July 2031");
  });

  it("empty: on today's month in the zone", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2029-05-10T12:00:00Z"));
    inLocale(<DatePicker label="Delivery date" timeZone="Europe/Berlin" />);
    expect(openHeading(/Delivery date/)).toBe("May 2029");
    vi.useRealTimers();
  });
});
