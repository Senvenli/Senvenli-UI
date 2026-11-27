import { useState } from "react";
import { Table, type TableColumn } from "@senvenli/react/collection";
import { Badge, Text } from "@senvenli/react/display";

type Customer = { id: string; name: string; email: string; city: string; plan: "pro" | "basic"; orders: number };
const CUSTOMERS: Customer[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", city: "London", plan: "pro", orders: 42 },
  { id: "2", name: "Grace Hopper", email: "grace@example.com", city: "New York", plan: "basic", orders: 18 },
  { id: "3", name: "Alan Turing", email: "alan@example.com", city: "Manchester", plan: "pro", orders: 64 },
];
const COLUMNS: TableColumn<Customer>[] = [
  { key: "name", header: "Customer", isRowHeader: true, description: (customer) => customer.email },
  { key: "city", header: "City" },
  { key: "plan", header: "Plan", render: (customer) => <Badge tone={customer.plan === "pro" ? "information" : "neutral"}>{customer.plan === "pro" ? "Pro" : "Basic"}</Badge> },
  { key: "orders", header: "Orders", align: "end" },
];

export default function Example() {
  const [opened, setOpened] = useState<string>();
  return (
    <div className="flex w-[40rem] max-w-full flex-col gap-ds-150">
      {/* Under 768px the same columns become cards: the row header is the title, the rest label–value lines. */}
      <Table aria-label="Customers" columns={COLUMNS} rows={CUSTOMERS} collapseBelow="md" onRowAction={(key) => setOpened(String(key))} />
      <Text tone="subtle">{opened ? `Opened customer ${opened}` : "Narrow the window below 768px to see the cards."}</Text>
    </div>
  );
}
