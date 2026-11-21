import { useState } from "react";
import { CalendarDate } from "@internationalized/date";
import { CalendarHeatmap } from "@senvenli/react/charts";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

const START = new CalendarDate(2026, 2, 2);
const TICKETS = Array.from({ length: 56 }, (_, index) => ({ date: START.add({ days: index }), value: (index * 5) % 17 }));

export default function Example() {
  const [day, setDay] = useState("Press a day to see its tickets.");
  return (
    <Stack space="space-150">
      <CalendarHeatmap
        title="Support tickets"
        period="February 2 – March 29, 2026"
        data={TICKETS}
        thresholds={[1, 5, 10, 15]}
        onDayPress={({ date, value }) => setDay(`${date.toString()}: ${value ?? 0} tickets`)}
      />
      <Text size="body-small" tone="subtle">{day}</Text>
    </Stack>
  );
}
