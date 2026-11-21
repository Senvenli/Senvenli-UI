import { RadialChart } from "@senvenli/react/charts";

const GOALS = [
  { name: "Revenue", value: 82 },
  { name: "New customers", value: 64 },
  { name: "Retention", value: 91 },
];

export default function Example() {
  return <RadialChart title="Quarterly goals" period="Q1 2026" data={GOALS} />;
}
