import { CalendarDate } from "@internationalized/date";
import { DateField } from "@senvenli/react/date";

export default function Example() {
  return <DateField label="Card expiry" granularity="month" defaultValue={new CalendarDate(2028, 9, 1)} />;
}
