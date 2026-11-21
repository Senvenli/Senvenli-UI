import { CalendarDate } from "@internationalized/date";
import { CalendarHeatmap } from "@senvenli/react/charts";

// Twelve fixed weeks from Monday, January 5, 2026. Calendar dates carry no time zone, so no day shifts.
const START = new CalendarDate(2026, 1, 5);
const ORDERS = Array.from({ length: 84 }, (_, index) => {
  const isWeekend = index % 7 >= 5;
  return { date: START.add({ days: index }), value: ((index * 7) % 13) * 3 + (isWeekend ? 2 : 18) };
});

export default function Example() {
  return <CalendarHeatmap title="Orders per day" period="January 5 – March 29, 2026" data={ORDERS} />;
}
