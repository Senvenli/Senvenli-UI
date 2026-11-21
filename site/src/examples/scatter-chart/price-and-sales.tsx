import { ScatterChart } from "@senvenli/react/charts";

const PRODUCTS = [
  { sku: "Desk mat", price: 29, units: 940 },
  { sku: "Cable tray", price: 38, units: 720 },
  { sku: "Footrest", price: 54, units: 610 },
  { sku: "Desk lamp", price: 79, units: 480 },
  { sku: "Monitor arm", price: 129, units: 390 },
  { sku: "Ergonomic chair", price: 349, units: 210 },
  { sku: "Standing desk", price: 589, units: 96 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  return (
    <ScatterChart
      title="Price and units sold"
      period="Q1 2026"
      data={PRODUCTS}
      name="sku"
      x="price"
      y="units"
      xLabel="Price (USD)"
      yLabel="Units sold"
      valueFormatters={{ x: usd.format }}
    />
  );
}
