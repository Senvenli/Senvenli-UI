import { ComposedChart } from "@senvenli/react/charts";

const MONTHS = [
  { month: "Jan", orders: 1240, conversion: 0.021 },
  { month: "Feb", orders: 1310, conversion: 0.023 },
  { month: "Mar", orders: 1525, conversion: 0.027 },
  { month: "Apr", orders: 1480, conversion: 0.025 },
  { month: "May", orders: 1690, conversion: 0.029 },
  { month: "Jun", orders: 1820, conversion: 0.031 },
];
const count = new Intl.NumberFormat("en");
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 });

export default function Example() {
  return (
    <ComposedChart
      title="Orders and conversion"
      period="Jan–Jun 2026"
      data={MONTHS}
      index="month"
      bars={[{ key: "orders", axis: "left" }]}
      lines={[{ key: "conversion", axis: "right" }]}
      labels={{ orders: "Orders", conversion: "Conversion rate" }}
      valueFormatters={{ left: count.format, right: percent.format }}
    />
  );
}
