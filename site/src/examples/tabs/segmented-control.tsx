import { Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { SegmentedControl } from "@senvenli/react/navigation";
import { useState } from "react";

const REVENUE: Record<string, string> = { day: "$4,280", week: "$31,460", month: "$128,900" };

export default function Example() {
  const [period, setPeriod] = useState<string | number>("week");
  return (
    <Inline space="space-200">
      <SegmentedControl
        label="Period"
        value={period}
        onChange={setPeriod}
        items={[
          { id: "day", label: "Day" },
          { id: "week", label: "Week" },
          { id: "month", label: "Month" },
        ]}
      />
      <Text isNumeric>Revenue: {REVENUE[period]}</Text>
    </Inline>
  );
}
