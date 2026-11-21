import { CalendarDate } from "@internationalized/date";
import { Tracker } from "@senvenli/react/charts";

// Thirty fixed days ending March 18, 2026: the same strip whenever the page is read.
const START = new CalendarDate(2026, 2, 17);
const STATUS: Record<number, string> = { 11: "outage", 12: "degraded", 22: "degraded" };
const DAYS = Array.from({ length: 30 }, (_, index) => ({ date: START.add({ days: index }), status: STATUS[index] ?? "operational" }));

export default function Example() {
  return (
    <Tracker
      title="Checkout API"
      period="Last 30 days"
      data={DAYS}
      statusMap={{
        operational: { tone: "success", label: "Operational" },
        degraded: { tone: "warning", label: "Degraded" },
        outage: { tone: "danger", label: "Outage" },
      }}
    />
  );
}
