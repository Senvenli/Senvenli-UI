import { LineChart } from "@senvenli/react/charts";

const REVENUE = [
  { month: "Jan", revenue: 38200 },
  { month: "Feb", revenue: 41500 },
  { month: "Mar", revenue: 47900 },
  { month: "Apr", revenue: 45100 },
  { month: "May", revenue: 52300 },
  { month: "Jun", revenue: 56800 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" });

export default function Example() {
  return (
    <LineChart
      title="Monthly revenue"
      period="Jan–Jun 2026"
      total={usd.format(281800)}
      data={REVENUE}
      index="month"
      categories={["revenue"]}
      labels={{ revenue: "Revenue" }}
      valueFormatter={usd.format}
      referenceLines={[{ value: 50000, label: "Target" }]}
    />
  );
}
