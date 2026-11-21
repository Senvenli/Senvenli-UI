import { DonutChart } from "@senvenli/react/charts";

const PLANS = [
  { name: "Free", value: 5200 },
  { name: "Team", value: 1900 },
  { name: "Enterprise", value: 340 },
];

export default function Example() {
  return <DonutChart title="Customers by plan" data={PLANS} centerLabel="customers" showList={false} height={200} />;
}
