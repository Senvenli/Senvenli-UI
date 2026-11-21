import { Stack } from "@senvenli/react/layout";
import { Checkbox, CheckboxGroup } from "@senvenli/react/selection";
import { useState } from "react";

const COLUMNS = [
  { value: "customer", label: "Customer" },
  { value: "status", label: "Status" },
  { value: "total", label: "Total" },
];

export default function Example() {
  const [shown, setShown] = useState(["customer", "total"]);
  const all = shown.length === COLUMNS.length;
  return (
    <Stack space="space-150">
      <Checkbox
        isSelected={all}
        isIndeterminate={shown.length > 0 && !all}
        onChange={(isSelected) => setShown(isSelected ? COLUMNS.map((column) => column.value) : [])}
      >
        Show all columns
      </Checkbox>
      <CheckboxGroup label="Columns" value={shown} onChange={setShown}>
        {COLUMNS.map((column) => (
          <Checkbox key={column.value} value={column.value}>
            {column.label}
          </Checkbox>
        ))}
      </CheckboxGroup>
    </Stack>
  );
}
