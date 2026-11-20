import { CalendarDate, Time } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import { parseDate, parseTime } from "./index";

describe("/date re-exports", () => {
  it("parseDate parses an ISO date into a CalendarDate", () => {
    const date = parseDate("2026-10-14");
    expect(date).toBeInstanceOf(CalendarDate);
    expect([date.year, date.month, date.day]).toEqual([2026, 10, 14]);
    expect(date.toString()).toBe("2026-10-14");
  });

  it("parseTime parses an ISO time into a Time", () => {
    const time = parseTime("09:30");
    expect(time).toBeInstanceOf(Time);
    expect([time.hour, time.minute]).toEqual([9, 30]);
  });

  it("rejects invalid input like the source", () => {
    expect(() => parseDate("14.10.2026")).toThrow();
  });
});
