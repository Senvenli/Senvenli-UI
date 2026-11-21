import { BarChart } from "@senvenli/react/charts";

const SIGNUPS = [
  { week: "Week 1", customers: 14 },
  { week: "Week 2", customers: 22 },
  { week: "Week 3", customers: 17 },
  { week: "Week 4", customers: 26 },
  { week: "Week 5", customers: 19 },
];

export default function Example() {
  return (
    <BarChart
      title="New customers"
      period="March 2026"
      data={SIGNUPS}
      index="week"
      categories={["customers"]}
      labels={{ customers: "New customers" }}
      indexLabel="Week"
      allowDecimals={false}
      referenceLines={[{ value: 20, label: "Target" }]}
    />
  );
}
