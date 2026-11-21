import { useState } from "react";
import { Table, type TableProps } from "@senvenli/react/collection";

type Customer = { id: string; name: string; orders: number; spent: number };
const CUSTOMERS: Customer[] = [
  { id: "1", name: "Ada Lovelace", orders: 42, spent: 13020 },
  { id: "2", name: "Grace Hopper", orders: 18, spent: 11520 },
  { id: "3", name: "Alan Turing", orders: 64, spent: 6080 },
  { id: "4", name: "Katherine Johnson", orders: 27, spent: 4860 },
  { id: "5", name: "Margaret Hamilton", orders: 9, spent: 3780 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Sort = NonNullable<TableProps<Customer>["sortDescriptor"]>;

export default function Example() {
  const [sort, setSort] = useState<Sort>({ column: "spent", direction: "descending" });
  const key = sort.column as keyof Customer;
  const sign = sort.direction === "descending" ? -1 : 1;
  const rows = [...CUSTOMERS].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * sign);
  return (
    <Table
      aria-label="Customers"
      density="compact"
      rows={rows}
      sortDescriptor={sort}
      onSortChange={setSort}
      columns={[
        { key: "name", header: "Customer", isSortable: true },
        { key: "orders", header: "Orders", align: "end", isSortable: true },
        { key: "spent", header: "Total spent", align: "end", isSortable: true, render: (customer) => usd.format(customer.spent) },
      ]}
    />
  );
}
