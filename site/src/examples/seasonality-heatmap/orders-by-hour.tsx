import { SeasonalityHeatmap } from "@senvenli/react/charts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];
// A lunch and an evening peak, weaker on weekends: fixed arithmetic, no random values.
const HOUR_LOAD = [12, 26, 48, 31, 29, 54, 37];
const DAY_LOAD = [1, 0.9, 1.1, 1.2, 1.4, 0.7, 0.5];
const ORDERS = DAYS.flatMap((row, day) => HOURS.map((column, hour) => ({ row, column, value: Math.round(HOUR_LOAD[hour]! * DAY_LOAD[day]!) })));

export default function Example() {
  return <SeasonalityHeatmap title="Orders by weekday and hour" period="March 2026" rows={DAYS} columns={HOURS} data={ORDERS} rowHeader="Day" />;
}
