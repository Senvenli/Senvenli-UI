import { Heatmap } from "@senvenli/react/charts";

// Cohort retention: the share of each signup month still active N weeks later, as a ratio from 0 to 1.
const COHORTS = ["June", "July", "August", "September", "October"];
const WEEKS = ["W0", "W1", "W2", "W3", "W4", "W5"];
const CURVE = [1, 0.58, 0.42, 0.34, 0.29, 0.26];

export default function Example() {
  const data = COHORTS.flatMap((row, r) =>
    WEEKS.map((column, w) => ({
      row,
      column,
      // A later cohort has fewer weeks behind it: those cells have no data yet.
      value: w > COHORTS.length - 1 - r + 1 ? null : Math.max(0, CURVE[w]! - r * 0.03 + (w % 2 ? 0.02 : 0)),
    })),
  );
  return (
    <div className="w-[40rem] max-w-full">
      <Heatmap title="Retention" period="By signup month" rowHeader="Cohort" rows={COHORTS} columns={WEEKS} data={data} scale="percent" />
    </div>
  );
}
