import { Button } from "@senvenli/react/action";
import { CommandPalette, toast, type CommandGroup, type CommandItem } from "@senvenli/react/overlay";
import { useState } from "react";

const GROUPS: CommandGroup[] = [
  { id: "actions", title: "Actions", items: [{ id: "create-customer", label: "Create customer", icon: "user-plus", kind: "action" }] },
];

const CUSTOMERS: CommandItem[] = [
  { id: "ada", label: "Ada Lovelace", detail: "CUS-0101", icon: "user", kind: "record", keywords: ["ada@example.com"] },
  { id: "alan", label: "Alan Turing", detail: "CUS-0102", icon: "user", kind: "record", keywords: ["alan@example.com"] },
  { id: "grace", label: "Grace Hopper", detail: "CUS-0103", icon: "user", kind: "record", keywords: ["grace@example.com"] },
];

// Stands in for `fetch("/api/search?q=…", { signal })`.
async function search(query: string): Promise<CommandGroup[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const text = query.toLowerCase();
  const items = CUSTOMERS.filter((customer) => [customer.label, customer.detail, ...(customer.keywords ?? [])].join(" ").toLowerCase().includes(text));
  return items.length ? [{ id: "customers", title: "Customers", items }] : [];
}

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button iconBefore="search" onPress={() => setIsOpen(true)}>
        Find a customer
      </Button>
      <CommandPalette isOpen={isOpen} onOpenChange={setIsOpen} groups={GROUPS} search={search} onSelect={(item) => toast(`Opened ${item.label}`)} />
    </>
  );
}
