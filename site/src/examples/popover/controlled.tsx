import { Button } from "@senvenli/react/action";
import { NumberField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Popover } from "@senvenli/react/overlay";
import { useState } from "react";

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  const [limit, setLimit] = useState(500);
  const [draft, setDraft] = useState(limit);
  return (
    <Popover
      title="Spending limit"
      isOpen={isOpen}
      onOpenChange={(next) => {
        setIsOpen(next);
        if (next) setDraft(limit);
      }}
      trigger={<Button>Limit: ${limit}</Button>}
    >
      <Stack space="space-200">
        <NumberField label="Monthly limit" minValue={0} step={50} value={draft} onChange={setDraft} formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />
        <Button
          variant="primary"
          onPress={() => {
            setLimit(draft);
            setIsOpen(false);
          }}
        >
          Apply
        </Button>
      </Stack>
    </Popover>
  );
}
