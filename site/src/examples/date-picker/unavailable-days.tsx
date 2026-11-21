import { CalendarDate, getDayOfWeek } from "@internationalized/date";
import { DatePicker } from "@senvenli/react/date";

// 0 is Sunday in en-US.
const isWeekend = (date: CalendarDate) => [0, 6].includes(getDayOfWeek(date, "en-US"));
const isFull = (date: CalendarDate) => date.month === 3 && [12, 20, 24].includes(date.day);

export default function Example() {
  return (
    <DatePicker
      label="Installation day"
      description="Weekdays only."
      defaultValue={new CalendarDate(2026, 3, 18)}
      timeZone="America/New_York"
      isDateUnavailable={(date) => isWeekend(date) || isFull(date)}
      unavailableReason={(date) => (isFull(date) ? "Fully booked" : isWeekend(date) ? "Closed" : undefined)}
      // `true` draws a dot; a phrase is also read by screen readers.
      getDateMarkers={(date) => (date.month === 3 && date.day === 19 ? "Last slot" : undefined)}
    />
  );
}
