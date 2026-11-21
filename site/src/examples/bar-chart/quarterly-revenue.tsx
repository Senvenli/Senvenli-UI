import { BarChart } from "@senvenli/react/charts";

const REVENUE = [
  { quarter: "Q1", revenue: 184000, lastYear: 162000 },
  { quarter: "Q2", revenue: 212000, lastYear: 171000 },
  { quarter: "Q3", revenue: 198000, lastYear: 189000 },
  { quarter: "Q4", revenue: 246000, lastYear: 205000 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" });

export default function Example() {
  return (
    <BarChart
      title="Revenue"
      period="2026 by quarter"
      data={REVENUE}
      index="quarter"
      categories={["revenue"]}
      comparison="lastYear"
      labels={{ revenue: "2026", lastYear: "2025" }}
      valueFormatter={usd.format}
    />
  );
}
