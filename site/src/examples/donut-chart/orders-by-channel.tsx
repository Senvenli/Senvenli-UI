import { DonutChart } from "@senvenli/react/charts";

const CHANNELS = [
  { name: "Website", value: 1840 },
  { name: "Mobile app", value: 1265 },
  { name: "Marketplace", value: 720 },
  { name: "Phone", value: 215 },
];

export default function Example() {
  return <DonutChart title="Orders by channel" period="March 2026" data={CHANNELS} centerLabel="orders" />;
}
