import { BarList } from "@senvenli/react/charts";

const PRODUCTS = [
  { name: "Ergonomic chair", value: 61900 },
  { name: "Standing desk, oak", value: 48200 },
  { name: "Monitor arm, dual", value: 23400 },
  { name: "Desk lamp", value: 12800 },
  { name: "Cable tray", value: 7600 },
  { name: "Footrest", value: 5100 },
  { name: "Desk mat", value: 3900 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  return <BarList title="Revenue by product" period="March 2026" data={PRODUCTS} valueFormatter={usd.format} />;
}
