import { useState } from "react";
import { CalendarDate } from "@internationalized/date";
import { DateRangePicker, type DateRangePickerValue } from "@senvenli/react/date";

const DAILY_BUDGET = 120;
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  // The value is null while a half is empty or typed in part.
  const [range, setRange] = useState<DateRangePickerValue | null>({ start: new CalendarDate(2026, 3, 18), end: new CalendarDate(2026, 3, 25) });
  const days = range ? range.end.compare(range.start) : 0;
  return (
    <DateRangePicker
      label="Campaign dates"
      startLabel="First day"
      endLabel="Last day"
      value={range}
      onChange={setRange}
      minValue={new CalendarDate(2026, 3, 18)}
      timeZone="America/New_York"
      footer={days > 0 ? usd.format(days * DAILY_BUDGET) : undefined}
    />
  );
}
