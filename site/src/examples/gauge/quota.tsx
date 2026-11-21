import { Gauge } from "@senvenli/react/charts";

const percent = new Intl.NumberFormat("en", { style: "percent" });

export default function Example() {
  return <Gauge title="Sales quota reached" period="Q1 2026" value={72} target={85} valueFormatter={(value) => percent.format(value / 100)} />;
}
