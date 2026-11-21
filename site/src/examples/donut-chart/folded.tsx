import { DonutChart } from "@senvenli/react/charts";

const COUNTRIES = [
  { name: "United States", value: 412000 },
  { name: "Germany", value: 186000 },
  { name: "United Kingdom", value: 154000 },
  { name: "Canada", value: 98000 },
  { name: "France", value: 71000 },
  { name: "Spain", value: 43000 },
  { name: "Netherlands", value: 29000 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" });

export default function Example() {
  return <DonutChart title="Revenue by country" period="2026" data={COUNTRIES} valueFormatter={usd.format} />;
}
