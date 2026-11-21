import { RadialChart } from "@senvenli/react/charts";

const FULFILLMENT = [
  { name: "Shipped on time", value: 94.5 },
  { name: "Delivered on time", value: 88.2 },
];
const percent = new Intl.NumberFormat("en", { style: "percent", minimumFractionDigits: 1 });

export default function Example() {
  return <RadialChart title="Fulfillment" period="March 2026" data={FULFILLMENT} valueFormatter={(value) => percent.format(value / 100)} />;
}
