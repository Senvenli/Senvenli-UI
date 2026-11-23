import { Heatmap } from "@senvenli/react/charts";

const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// March 2026 starts on a Sunday. The 17th has no figure (the register was offline): `null`, not 0.
const REVENUE = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const weekday = index % 7;
  const value = day === 17 ? null : 1800 + ((day * 37) % 11) * 240 + (weekday === 5 || weekday === 6 ? 1900 : 0);
  return { row: WEEKS[Math.floor(index / 7)]!, column: WEEKDAYS[weekday]!, value, label: `March ${day}` };
});

export default function Example() {
  return (
    <Heatmap
      title="Daily revenue"
      period="March 2026"
      rows={WEEKS}
      columns={WEEKDAYS}
      data={REVENUE}
      rowHeader="Week"
      thresholds={[1, 2500, 3500, 5000]}
      valueFormatter={usd.format}
    />
  );
}
