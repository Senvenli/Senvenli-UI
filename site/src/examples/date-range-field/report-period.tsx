import { CalendarDate } from "@internationalized/date";
import { DateRangeField } from "@senvenli/react/date";

export default function Example() {
  return (
    <DateRangeField
      label="Report period"
      defaultValue={{ start: new CalendarDate(2026, 3, 2), end: new CalendarDate(2026, 3, 18) }}
      timeZone="America/New_York"
    />
  );
}
