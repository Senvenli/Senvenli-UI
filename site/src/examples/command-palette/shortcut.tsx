import { Button } from "@senvenli/react/action";
import { Kbd, ModifierKbd, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { CommandPalette, toast, type CommandGroup, type CommandItem } from "@senvenli/react/overlay";
import { useState } from "react";

const GROUPS: CommandGroup[] = [
  {
    id: "actions",
    title: "Actions",
    items: [
      { id: "create-invoice", label: "Create invoice", icon: "plus", shortcut: "I", kind: "action" },
      { id: "export", label: "Export customers", icon: "download", kind: "action" },
    ],
  },
];

const RECENT: CommandItem[] = [
  { id: "inv-2041", label: "Analytical Engines Ltd", detail: "INV-2041", kind: "record", status: { label: "Paid", tone: "success" } },
  { id: "inv-2038", label: "Northwind Traders", detail: "INV-2038", kind: "record", status: { label: "Overdue", tone: "danger" } },
];

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Inline space="space-150">
      <Button onPress={() => setIsOpen(true)}>Open the palette</Button>
      <Text tone="subtle">
        or press <ModifierKbd /> <Kbd>K</Kbd>
      </Text>
      <CommandPalette
        shortcut
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        groups={GROUPS}
        recent={RECENT}
        onSelect={(item) => toast(`Opened ${item.detail ?? item.label}`)}
      />
    </Inline>
  );
}
