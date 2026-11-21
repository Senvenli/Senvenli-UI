import { RadarChart } from "@senvenli/react/charts";

const SATISFACTION = [
  { area: "Checkout", score: 88 },
  { area: "Delivery", score: 74 },
  { area: "Product quality", score: 91 },
  { area: "Support", score: 67 },
  { area: "Returns", score: 59 },
];
const percent = new Intl.NumberFormat("en", { style: "percent" });

export default function Example() {
  return (
    <RadarChart
      title="Customer satisfaction"
      period="Q1 2026 survey"
      data={SATISFACTION}
      dimension="area"
      categories={["score"]}
      labels={{ score: "Satisfied customers" }}
      max={100}
      valueFormatter={(value) => percent.format(value / 100)}
    />
  );
}
