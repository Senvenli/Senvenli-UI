import { AreaChart } from "@senvenli/react/charts";

const MRR = [
  { month: "Jun", mrr: 7400 },
  { month: "Jul", mrr: 8200 },
  { month: "Aug", mrr: 9100 },
  { month: "Sep", mrr: 10400 },
  { month: "Oct", mrr: 11300 },
  { month: "Nov", mrr: 12400 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  return (
    <div className="w-[40rem] max-w-full">
      {/* The goal is above every month so far: the value axis still reaches it, so the line is drawn. */}
      <AreaChart title="MRR" period="Last 6 months" data={MRR} index="month" categories={["mrr"]} valueFormatter={(value) => usd.format(value)} referenceLines={[{ value: 15000, label: "Goal $15k" }]} />
    </div>
  );
}
