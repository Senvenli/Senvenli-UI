import { GaugeChart } from "@senvenli/react/charts";

const gigabytes = new Intl.NumberFormat("en", { style: "unit", unit: "gigabyte" });

export default function Example() {
  return <GaugeChart title="Storage used" period="Team plan, 500 GB" value={318} max={500} valueFormatter={gigabytes.format} />;
}
