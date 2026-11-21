import { RadioGroup } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [priority, setPriority] = useState("normal");
  return (
    <RadioGroup
      label="Priority"
      description={`Saved as “${priority}”.`}
      orientation="horizontal"
      value={priority}
      onChange={setPriority}
      items={[
        { value: "low", label: "Low" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "High" },
      ]}
    />
  );
}
