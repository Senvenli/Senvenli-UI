import { CalendarDate } from "@internationalized/date";
import { Calendar } from "@senvenli/react/date";

export default function Example() {
  return <Calendar aria-label="Delivery day" defaultValue={new CalendarDate(2026, 3, 18)} />;
}
