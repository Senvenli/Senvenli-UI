import { CalendarDate } from "@internationalized/date";
import { DateField } from "@senvenli/react/date";

export default function Example() {
  return <DateField label="Delivery date" defaultValue={new CalendarDate(2026, 3, 18)} />;
}
