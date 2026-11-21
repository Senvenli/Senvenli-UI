import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "@senvenli/react/date";

export default function Example() {
  return (
    <DatePicker
      label="Return by"
      description="Returns are accepted for 30 days after delivery."
      defaultValue={new CalendarDate(2026, 3, 25)}
      minValue={new CalendarDate(2026, 3, 18)}
      maxValue={new CalendarDate(2026, 4, 17)}
      timeZone="America/New_York"
    />
  );
}
