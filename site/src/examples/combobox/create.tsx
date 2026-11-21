import { ComboBox, type ComboBoxItem } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [labels, setLabels] = useState<ComboBoxItem[]>([
    { id: "bug", label: "Bug" },
    { id: "billing", label: "Billing" },
    { id: "feature", label: "Feature request" },
  ]);
  const [label, setLabel] = useState<string | number | null>(null);
  return (
    <div className="max-w-80">
      <ComboBox
        label="Label"
        placeholder="Find or create a label"
        items={labels}
        selectedKey={label ?? undefined}
        onSelectionChange={setLabel}
        createLabel={(text) => `Create “${text}”`}
        onCreate={(text) => {
          setLabels((current) => [...current, { id: text, label: text }]);
          setLabel(text);
        }}
      />
    </div>
  );
}
