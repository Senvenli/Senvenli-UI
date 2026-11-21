import { ComboBox, type ComboBoxLoader } from "@senvenli/react/selection";

const PAGE = 5;
const ORDERS = Array.from({ length: 40 }, (_, index) => {
  const number = 1040 - index;
  return { id: `ORD-${number}`, label: `ORD-${number}`, description: index % 3 === 0 ? "Northwind Traders" : "Acme Supplies" };
});

// Stands in for `fetch("/api/orders?q=…&cursor=…", { signal })`.
const loadOrders: ComboBoxLoader = async (filterText, cursor) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const query = filterText.toLowerCase();
  const matches = ORDERS.filter((order) => `${order.label} ${order.description}`.toLowerCase().includes(query));
  const start = Number(cursor ?? 0);
  const next = start + PAGE;
  return { items: matches.slice(start, next), cursor: next < matches.length ? String(next) : undefined };
};

export default function Example() {
  return (
    <div className="max-w-80">
      <ComboBox label="Order" placeholder="Order number or customer" menuTrigger="focus" loadItems={loadOrders} />
    </div>
  );
}
