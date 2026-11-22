import { BarChart } from "@senvenli/react/charts";

export default function Example() {
  return (
    <BarChart type="waterfall"
      title="Customer movement"
      period="March 2026"
      steps={[
        { name: "New", value: 184 },
        { name: "Reactivated", value: 23 },
        { name: "Downgraded to free", value: -37 },
        { name: "Canceled", value: -61 },
      ]}
      endLabel="Net change"
    />
  );
}
