import { CalendarDate } from "@internationalized/date";
import { DateRangePicker } from "@senvenli/react/date";

export default function Example() {
  return (
    <DateRangePicker
      label="Report period"
      defaultValue={{ start: new CalendarDate(2026, 3, 2), end: new CalendarDate(2026, 3, 18) }}
      timeZone="America/New_York"
    />
  );
}
