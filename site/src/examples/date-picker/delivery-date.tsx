import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "@senvenli/react/date";

export default function Example() {
  // `timeZone` decides which day "Today" is: the warehouse's zone, not the visitor's device.
  return <DatePicker label="Delivery date" defaultValue={new CalendarDate(2026, 3, 18)} timeZone="America/New_York" />;
}
