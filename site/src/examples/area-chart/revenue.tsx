import { AreaChart } from "@senvenli/react/charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE = MONTHS.map((month, i) => ({ month, online: 32000 + i * 2400, retail: 18000 + i * 900 }));

export default function Example() {
  return (
    <AreaChart
      title="Revenue"
      period="Jan–Dec 2026"
      data={REVENUE}
      index="month"
      categories={["online", "retail"]}
      labels={{ online: "Online", retail: "Retail" }}
    />
  );
}
