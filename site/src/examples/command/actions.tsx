import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { Command, type CommandGroup } from "@senvenli/react/overlay";
import { useState } from "react";

const GROUPS: CommandGroup[] = [
  {
    id: "actions",
    title: "Actions",
    items: [
      { id: "create-order", label: "Create order", icon: "plus", shortcut: "N", kind: "action" },
      { id: "send-invoice", label: "Send invoice", icon: "send", kind: "action" },
      { id: "invite-member", label: "Invite team member", icon: "user-plus", kind: "action", keywords: ["add user"] },
    ],
  },
  {
    id: "pages",
    title: "Pages",
    items: [
      { id: "orders", label: "Orders", icon: "shopping-cart", kind: "page" },
      { id: "customers", label: "Customers", icon: "users", kind: "page" },
      { id: "settings", label: "Settings", icon: "settings", kind: "page" },
    ],
  },
];

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  const [chosen, setChosen] = useState("nothing yet");
  return (
    <Inline space="space-150">
      <Button iconBefore="search" onPress={() => setIsOpen(true)}>
        Search
      </Button>
      <Text tone="subtle">Chosen: {chosen}</Text>
      <Command isOpen={isOpen} onOpenChange={setIsOpen} groups={GROUPS} onSelect={(item) => setChosen(item.label)} />
    </Inline>
  );
}
