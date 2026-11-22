import { Inline } from "@senvenli/react/layout";
import { Select } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [period, setPeriod] = useState<string | number | null>("30");
  return (
    <Inline space="space-100">
      <Select
        aria-label="Period"
        size="small"
        selectedKey={period}
        onSelectionChange={setPeriod}
        items={[
          { id: "7", label: "Last 7 days" },
          { id: "30", label: "Last 30 days" },
          { id: "90", label: "Last 90 days" },
        ]}
      />
      <Select
        aria-label="Channel"
        size="small"
        placeholder="All channels"
        items={[
          { id: "online", label: "Online" },
          { id: "retail", label: "Retail" },
        ]}
      />
    </Inline>
  );
}
