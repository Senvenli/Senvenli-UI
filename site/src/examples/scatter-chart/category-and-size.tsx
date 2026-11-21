import { ScatterChart } from "@senvenli/react/charts";

const CUSTOMERS = [
  { name: "Acme Corp", orders: 42, average: 310, revenue: 13020, plan: "enterprise" },
  { name: "Globex", orders: 18, average: 640, revenue: 11520, plan: "enterprise" },
  { name: "Initech", orders: 64, average: 95, revenue: 6080, plan: "team" },
  { name: "Umbrella", orders: 27, average: 180, revenue: 4860, plan: "team" },
  { name: "Hooli", orders: 9, average: 420, revenue: 3780, plan: "enterprise" },
  { name: "Stark Industries", orders: 51, average: 60, revenue: 3060, plan: "team" },
  { name: "Wayne Enterprises", orders: 33, average: 75, revenue: 2475, plan: "team" },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  return (
    <ScatterChart
      title="Customers by order pattern"
      period="2026"
      data={CUSTOMERS}
      name="name"
      x="orders"
      y="average"
      size="revenue"
      category={{ key: "plan", value: "enterprise", label: "Enterprise", otherLabel: "Team" }}
      xLabel="Orders"
      yLabel="Order value (USD)"
      valueFormatters={{ y: usd.format }}
    />
  );
}
