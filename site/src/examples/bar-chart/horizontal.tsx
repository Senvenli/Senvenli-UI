import { BarChart } from "@senvenli/react/charts";

const PRODUCTS = [
  { product: "Standing desk, oak", revenue: 48200 },
  { product: "Ergonomic chair", revenue: 61900 },
  { product: "Monitor arm, dual", revenue: 23400 },
  { product: "Desk lamp", revenue: 12800 },
  { product: "Cable tray", revenue: 7600 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  // Horizontal bars sort themselves by value; pass sortBy="none" when the categories have their own order.
  return (
    <BarChart
      layout="horizontal"
      title="Revenue by product"
      period="March 2026"
      data={PRODUCTS}
      index="product"
      categories={["revenue"]}
      labels={{ revenue: "Revenue" }}
      indexLabel="Product"
      valueFormatter={usd.format}
    />
  );
}
