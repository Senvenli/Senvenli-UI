import { CalendarDate } from "@internationalized/date";
import { DesignSystemProvider } from "@senvenli/react";
import { DatePicker } from "@senvenli/react/date";

// Month and weekday names, the date order and the first day of the week come from the locale. The label is the
// app's own words; the library's few strings stay English until you register Spanish ones.
export default function Example() {
  return (
    <DesignSystemProvider locale="es-ES">
      <DatePicker label="Fecha de entrega" defaultValue={new CalendarDate(2026, 3, 18)} timeZone="Europe/Madrid" />
    </DesignSystemProvider>
  );
}
