import { CalendarDate } from "@internationalized/date";
import { DateField } from "@senvenli/react/date";

export default function Example() {
  return (
    <DateField
      label="Invoice date"
      description="Any day in the first quarter of 2026."
      defaultValue={new CalendarDate(2026, 3, 18)}
      minValue={new CalendarDate(2026, 1, 1)}
      maxValue={new CalendarDate(2026, 3, 31)}
      isRequired
    />
  );
}
