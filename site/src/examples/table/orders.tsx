import { Table } from "@senvenli/react/collection";
import { Badge } from "@senvenli/react/display";

const ORDERS = [
  { id: "SO-1042", customer: "Ada Lovelace", email: "ada@example.com", date: "Mar 18, 2026", total: 248.5, isPaid: true },
  { id: "SO-1043", customer: "Grace Hopper", email: "grace@example.com", date: "Mar 18, 2026", total: 96, isPaid: false },
  { id: "SO-1044", customer: "Alan Turing", email: "alan@example.com", date: "Mar 17, 2026", total: 1290, isPaid: true },
  { id: "SO-1045", customer: "Katherine Johnson", email: "katherine@example.com", date: "Mar 16, 2026", total: 54.9, isPaid: true },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });

export default function Example() {
  return (
    <Table
      aria-label="Orders"
      rows={ORDERS}
      columns={[
        { key: "id", header: "Order", isRowHeader: true },
        { key: "customer", header: "Customer", description: (order) => <bdi>{order.email}</bdi> },
        { key: "date", header: "Date", hideBelow: "sm" },
        { key: "isPaid", header: "Payment", render: (order) => (order.isPaid ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Pending</Badge>) },
        { key: "total", header: "Total", align: "end", render: (order) => usd.format(order.total) },
      ]}
    />
  );
}
