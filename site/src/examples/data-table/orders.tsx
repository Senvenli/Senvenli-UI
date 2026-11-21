import { useState } from "react";
import { CalendarDate } from "@internationalized/date";
import { DataTable, type DataTableColumn } from "@senvenli/react/collection";
import { Lozenge } from "@senvenli/react/display";

const STATUS = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  shipped: { label: "Shipped", tone: "information" },
  refunded: { label: "Refunded", tone: "neutral" },
} as const;
type Status = keyof typeof STATUS;
type Order = { id: string; customer: string; date: string; status: Status; total: number };

// Forty fixed orders: index arithmetic, never a random value or today's date.
const CUSTOMERS = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Margaret Hamilton", "Barbara Liskov", "Donald Knuth"];
const STATUSES: Status[] = ["paid", "pending", "paid", "shipped", "paid", "refunded"];
const FIRST_DAY = new CalendarDate(2026, 2, 7);
const ORDERS: Order[] = Array.from({ length: 40 }, (_, index) => ({
  id: `SO-${1042 + index}`,
  customer: CUSTOMERS[index % CUSTOMERS.length]!,
  date: FIRST_DAY.add({ days: index }).toString(),
  status: STATUSES[index % STATUSES.length]!,
  total: 45 + ((index * 37) % 23) * 18.5,
}));

const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });
const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const COLUMNS: DataTableColumn<Order>[] = [
  { key: "id", header: "Order", isRowHeader: true, isSortable: true },
  { key: "customer", header: "Customer", isSortable: true },
  // Sorted and searched by the ISO date under `key`, shown short.
  { key: "date", header: "Date", isSortable: true, isHideable: true, render: (order) => day.format(new Date(order.date)) },
  { key: "status", header: "Status", isHideable: true, render: (order) => <Lozenge tone={STATUS[order.status].tone}>{STATUS[order.status].label}</Lozenge> },
  { key: "total", header: "Total", align: "end", isSortable: true, render: (order) => usd.format(order.total) },
];
const FILTERS = [{ key: "status", label: "Status", options: Object.entries(STATUS).map(([id, status]) => ({ id, label: status.label })) }];

export default function Example() {
  const [orders, setOrders] = useState(ORDERS);
  return (
    <DataTable
      aria-label="Orders"
      rows={orders}
      columns={COLUMNS}
      filters={FILTERS}
      defaultSort={{ column: "date", direction: "descending" }}
      pageSize={10}
      // The view lives in the URL (?orders.page=2&orders.status=paid); the prefix keeps two tables on a page apart.
      urlKey="orders"
      bulkActions={[
        {
          id: "ship",
          label: "Mark as shipped",
          // Gets the selected ids from every page; the selection clears once this returns.
          onAction: (keys) => setOrders((current) => current.map((order) => (keys.includes(order.id) ? { ...order, status: "shipped" } : order))),
        },
      ]}
    />
  );
}
