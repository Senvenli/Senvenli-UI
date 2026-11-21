import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { BulkBar } from "@senvenli/react/navigation";
import { toast } from "@senvenli/react/overlay";
import { Checkbox, CheckboxGroup } from "@senvenli/react/selection";
import { useState } from "react";

const ORDERS = ["ORD-1040", "ORD-1039", "ORD-1038", "ORD-1037"];

export default function Example() {
  const [selected, setSelected] = useState(["ORD-1040", "ORD-1038"]);
  return (
    <Stack space="space-200">
      <CheckboxGroup label="Orders awaiting payment" value={selected} onChange={setSelected}>
        {ORDERS.map((order) => (
          <Checkbox key={order} value={order}>
            {order}
          </Checkbox>
        ))}
      </CheckboxGroup>
      {selected.length > 0 && (
        <BulkBar
          aria-label="Selected orders"
          selectedCount={selected.length}
          onClear={() => setSelected([])}
          actions={
            <>
              <Button size="compact" iconBefore="mail" onPress={() => toast.success("Reminders sent")}>
                Send reminder
              </Button>
              <Button size="compact" iconBefore="download">
                Export
              </Button>
            </>
          }
        />
      )}
    </Stack>
  );
}
