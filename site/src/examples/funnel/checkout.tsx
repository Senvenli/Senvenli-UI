import { Funnel } from "@senvenli/react/charts";

const STEPS = [
  { name: "Visited the store", value: 24800 },
  { name: "Viewed a product", value: 13150 },
  { name: "Added to cart", value: 4620 },
  { name: "Started checkout", value: 2310 },
  { name: "Placed an order", value: 1525 },
];
const count = new Intl.NumberFormat("en");

export default function Example() {
  return <Funnel title="Checkout funnel" period="March 2026" steps={STEPS} valueFormatter={count.format} />;
}
