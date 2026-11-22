import { FunnelChart } from "@senvenli/react/charts";

const STEPS = [
  { name: "Trials started", value: 860 },
  { name: "Invited a teammate", value: 512 },
  { name: "Connected a data source", value: 298 },
  { name: "Upgraded to a paid plan", value: 121 },
];

export default function Example() {
  return <FunnelChart title="Trial to paid" period="Q1 2026" steps={STEPS} showStepConversion={false} showTotalConversion={false} />;
}
