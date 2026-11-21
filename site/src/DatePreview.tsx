import { Card, CardBody, CardHeader } from "@senvenli/react/display";
import { Calendar, DateField, DatePicker, DateRangeField, TimeSlots, parseTime } from "@senvenli/react/date";
import { Stack } from "@senvenli/react/layout";
import { ClientOnly } from "./lib/client-only";

/** The date family: fields, pickers, a calendar and time slots. */
export function DatePreview() {
  return (
    <>
      <Card>
        <CardHeader title="Dates" subtitle="DateField, DatePicker, DateRangeField" />
        <CardBody>
          <Stack space="space-300">
            <DateField label="Birthday" />
            <DatePicker label="Due date" description="We remind you a day before." />
            <DateRangeField label="Trip dates" />
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Calendar and time" subtitle="Calendar, TimeSlots" />
        <CardBody>
          <Stack space="space-300">
            {/* A bare Calendar opens on the visitor's month, which the prerender cannot know: client only, box reserved. */}
            <ClientOnly minHeight={326}>{() => <Calendar aria-label="Availability" />}</ClientOnly>
            <TimeSlots
              label="Appointment"
              slots={[
                { time: parseTime("09:00"), isAvailable: true },
                { time: parseTime("10:30"), isAvailable: true },
                { time: parseTime("12:00"), isAvailable: false, note: "Full" },
                { time: parseTime("14:00"), isAvailable: true },
                { time: parseTime("16:30"), isAvailable: true, note: "After hours" },
              ]}
            />
          </Stack>
        </CardBody>
      </Card>
    </>
  );
}
