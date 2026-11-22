import { CalendarDate } from "@internationalized/date";
import { DesignSystemProvider } from "@senvenli/react";
import { DatePicker } from "@senvenli/react/date";

// Right to left: the page (here a wrapper) sets dir="rtl". The field and the calendar mirror, the arrows point the
// reading way, and the digits follow the locale (ar-EG uses Arabic-Indic digits; ar-AE keeps Latin ones).
export default function Example() {
  return (
    <div dir="rtl" lang="ar">
      <DesignSystemProvider locale="ar-EG">
        <DatePicker label="تاريخ التسليم" defaultValue={new CalendarDate(2026, 3, 18)} timeZone="Africa/Cairo" />
      </DesignSystemProvider>
    </div>
  );
}
