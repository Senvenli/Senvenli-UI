import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "@senvenli/react/date";

export default function Example() {
  return (
    <DatePicker selectionMode="range"
      label="Report period"
      defaultValue={{ start: new CalendarDate(2026, 3, 2), end: new CalendarDate(2026, 3, 18) }}
      timeZone="America/New_York"
    />
  );
}
