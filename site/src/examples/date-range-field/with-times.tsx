import { CalendarDateTime } from "@internationalized/date";
import { DateRangeField } from "@senvenli/react/date";

export default function Example() {
  return (
    <DateRangeField
      label="Maintenance window"
      description="Times are in the data center's zone."
      granularity="hour"
      defaultValue={{ start: new CalendarDateTime(2026, 3, 18, 22, 0), end: new CalendarDateTime(2026, 3, 19, 2, 30) }}
      timeZone="America/New_York"
    />
  );
}
