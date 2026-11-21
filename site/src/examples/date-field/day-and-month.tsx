import { CalendarDate } from "@internationalized/date";
import { DateField } from "@senvenli/react/date";

export default function Example() {
  // The value's year is always 2000, a leap year, so February 29 can be typed.
  return <DateField label="Birthday" description="We send a discount code every year." hideYear defaultValue={new CalendarDate(2000, 12, 10)} />;
}
