import { BarChart } from "@senvenli/react/charts";

const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" });

export default function Example() {
  return (
    <BarChart type="waterfall"
      title="From revenue to profit"
      period="Q1 2026"
      start={{ name: "Revenue", value: 248000 }}
      steps={[
        { name: "Cost of goods", value: -96000 },
        { name: "Salaries", value: -64000 },
        { name: "Marketing", value: -21000 },
        { name: "Other income", value: 8000 },
      ]}
      endLabel="Net profit"
      valueFormatter={usd.format}
    />
  );
}
