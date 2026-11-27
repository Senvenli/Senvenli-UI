import * as React from "react";
import { Stat, StatGroup, Text, type StatGroupProps } from "@senvenli/react/display";

type Keys = Parameters<NonNullable<StatGroupProps["onSelectionChange"]>>[0];

const METRICS = [
  { id: "visitors", label: "Visitors", value: "12,480", delta: { value: "4.2%", direction: "up" as const } },
  { id: "views", label: "Page views", value: "40,112", delta: { value: "1.8%", direction: "down" as const } },
  { id: "bounce", label: "Bounce rate", value: "41%", delta: { value: "2.0%", direction: "down" as const, isPositive: true } },
  { id: "duration", label: "Visit duration", value: "2m 14s", delta: { value: "0%", direction: "flat" as const } },
];

export default function Example() {
  const [metric, setMetric] = React.useState<Keys>(new Set(["visitors"]));
  const chosen = METRICS.find((item) => metric.has(item.id));
  return (
    <div className="flex w-[42rem] max-w-full flex-col gap-ds-200">
      <StatGroup aria-label="Metric shown in the chart" selectionMode="single" disallowEmptySelection selectedKeys={metric} onSelectionChange={setMetric}>
        {METRICS.map((item) => (
          <Stat key={item.id} id={item.id} label={item.label} value={item.value} delta={item.delta} comparison="vs. last week" />
        ))}
      </StatGroup>
      <Text tone="subtle">Chart shows: {chosen?.label}</Text>
    </div>
  );
}
