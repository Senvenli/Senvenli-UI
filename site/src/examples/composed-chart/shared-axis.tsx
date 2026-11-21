import { ComposedChart } from "@senvenli/react/charts";

const MONTHS = [
  { month: "Jan", revenue: 38200, forecast: 36000 },
  { month: "Feb", revenue: 41500, forecast: 40000 },
  { month: "Mar", revenue: 47900, forecast: 44000 },
  { month: "Apr", revenue: 45100, forecast: 48000 },
  { month: "May", revenue: 52300, forecast: 52000 },
  { month: "Jun", revenue: 56800, forecast: 56000 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" });

export default function Example() {
  return (
    <ComposedChart
      title="Revenue against forecast"
      period="Jan–Jun 2026"
      data={MONTHS}
      index="month"
      bars={[{ key: "revenue", axis: "left" }]}
      lines={[{ key: "forecast", axis: "left" }]}
      labels={{ revenue: "Revenue", forecast: "Forecast" }}
      // Both formatters are required; with one axis in use, the right one is never called.
      valueFormatters={{ left: usd.format, right: usd.format }}
    />
  );
}
