import { AreaChart } from "@senvenli/react/charts";
import { Calendar } from "@senvenli/react/date";
import { Timeline } from "@senvenli/react/display";
import { CalendarDate } from "@internationalized/date";
import type { ReactNode } from "react";
import { ClientOnly } from "../lib/client-only";

/*
 * The rule for examples: the prerendered HTML is built once and read on any later day, in any time zone.
 * So an example never reads the clock, the device zone, a random number or the viewport while rendering:
 *   - dates are fixed values (`new CalendarDate(2026, 3, 18)`, an ISO instant with its offset);
 *   - anything formatted from an instant names its `timeZone`;
 *   - "now" is passed in (`now={NOW}`), never read;
 *   - an example that must be live (today, a ticking clock) goes inside <ClientOnly> with its box reserved.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE = MONTHS.map((month, i) => ({ month, online: 32000 + i * 2400, retail: 18000 + i * 900 }));

/** A fixed instant, written with its offset: the same on the build machine and in every browser. */
const NOW = new Date("2026-03-18T14:30:00+01:00");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

/** The calendar frame at one visible month, measured: 290px with five week rows, 326px with six. */
const CALENDAR_HEIGHT = 326;

export const EXAMPLES: Record<string, () => ReactNode> = {
  "area-chart": () => (
    <AreaChart title="Revenue" period="Jan–Dec 2026" data={REVENUE} index="month" categories={["online", "retail"]} labels={{ online: "Online", retail: "Retail" }} />
  ),

  calendar: () => (
    <div className="flex flex-col gap-ds-300">
      {/* Deterministic: a fixed chosen day fixes the visible month. "Today" is marked after mount by the library. */}
      <Calendar aria-label="Fixed month" defaultValue={new CalendarDate(2026, 3, 18)} />
      {/* Live: a bare Calendar opens on the visitor's month, which the build cannot know. */}
      <ClientOnly minHeight={CALENDAR_HEIGHT}>{() => <Calendar aria-label="This month" />}</ClientOnly>
    </div>
  ),

  timeline: () => (
    <Timeline
      timeZone="Europe/Berlin"
      now={NOW}
      items={[
        { id: "4", icon: "circle-check", tone: "success", title: "Order delivered", meta: "Courier", timestamp: ago(3) },
        { id: "3", icon: "truck", tone: "brand", title: "Order shipped", timestamp: ago(240) },
        { id: "2", icon: "pencil", title: "Address changed", meta: "From the mobile app", timestamp: ago(60 * 26) },
        { id: "1", icon: "shopping-cart", title: "Order placed", timestamp: ago(60 * 28) },
      ]}
    />
  ),
};
