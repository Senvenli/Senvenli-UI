import { useState } from "react";
import { DatePicker, type DateRangePreset } from "@senvenli/react/date";
import { Text } from "@senvenli/react/display";

// Stable ids, never labels: keep `period=7d` in the URL and compute the range again on load.
const PRESETS: DateRangePreset[] = [
  { id: "today", label: "Today", range: (today) => ({ start: today, end: today }) },
  { id: "7d", label: "Last 7 days", range: (today) => ({ start: today.subtract({ days: 6 }), end: today }) },
  { id: "30d", label: "Last 30 days", range: (today) => ({ start: today.subtract({ days: 29 }), end: today }) },
  { id: "mtd", label: "Month to date", range: (today) => ({ start: today.set({ day: 1 }), end: today }) },
  { id: "ytd", label: "Year to date", range: (today) => ({ start: today.set({ month: 1, day: 1 }), end: today }) },
];

export default function Example() {
  const [period, setPeriod] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-ds-100">
      <DatePicker
        selectionMode="range"
        label="Period"
        presets={PRESETS}
        presetId={period}
        onPresetChange={setPeriod}
        timeZone="Europe/Berlin"
      />
      <Text size="body-small" tone="subtle">period={period ?? "custom"}</Text>
    </div>
  );
}
