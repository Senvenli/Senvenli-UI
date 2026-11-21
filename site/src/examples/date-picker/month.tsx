import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "@senvenli/react/date";

export default function Example() {
  return (
    <DatePicker
      label="Report month"
      granularity="month"
      defaultValue={new CalendarDate(2026, 3, 1)}
      maxValue={new CalendarDate(2026, 3, 1)}
      timeZone="America/New_York"
    />
  );
}
