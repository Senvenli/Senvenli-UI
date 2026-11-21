import { useState } from "react";
import { ChartFrame, ChartLegend, ChartTooltip, chartSeries, useChartSeries } from "@senvenli/react/charts";

const ROWS = [
  { id: "north", region: "North", before: 4.2, after: 2.9 },
  { id: "south", region: "South", before: 5.1, after: 3.4 },
  { id: "east", region: "East", before: 3.6, after: 3.1 },
  { id: "west", region: "West", before: 4.8, after: 2.6 },
];
// chartSeries() gives each series its token color: the comparison is neutral, the current one the brand color.
const SERIES = [
  { key: "before", label: "2025", ...chartSeries(0, { isComparison: true }) },
  { key: "after", label: "2026", ...chartSeries(0) },
] as const;
const SCALE_MAX = 6;
const position = (value: number) => `${(value / SCALE_MAX) * 100}%`;
const days = new Intl.NumberFormat("en", { style: "unit", unit: "day", unitDisplay: "long" });

export default function Example() {
  const { hidden, toggle, isHidden } = useChartSeries();
  const [active, setActive] = useState<string | null>(null);
  const shown = SERIES.filter((series) => !isHidden(series.key));
  return (
    <ChartFrame
      height={176}
      legend={<ChartLegend items={SERIES} hidden={hidden} onToggle={toggle} />}
      // The same figures as a table: what screen readers get, and what the "Show as table" button shows.
      dataTable={{
        caption: "Average delivery time by region",
        rows: ROWS,
        columns: [
          { key: "region", header: "Region", isRowHeader: true },
          { key: "before", header: "2025", align: "end", render: (row) => days.format(row.before) },
          { key: "after", header: "2026", align: "end", render: (row) => days.format(row.after) },
        ],
      }}
    >
      <div className="flex h-full flex-col justify-around">
        {ROWS.map((row) => (
          <div key={row.id} className="relative flex items-center gap-ds-200" onPointerEnter={() => setActive(row.id)} onPointerLeave={() => setActive(null)}>
            <span className="w-12 shrink-0 text-body-small text-ds-text-subtle">{row.region}</span>
            <div className="relative h-4 flex-1">
              {shown.length === 2 && (
                <span
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ds-border-bold"
                  style={{ insetInlineStart: position(Math.min(row.before, row.after)), width: position(Math.abs(row.before - row.after)) }}
                />
              )}
              {shown.map((series) => (
                <span
                  key={series.key}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-ds-full rtl:translate-x-1/2"
                  style={{ insetInlineStart: position(row[series.key]), background: series.color }}
                />
              ))}
            </div>
            {active === row.id && (
              <div className="pointer-events-none absolute end-0 top-full z-10">
                <ChartTooltip
                  active
                  label={row.region}
                  payload={shown.map((series) => ({ dataKey: series.key, name: series.label, value: row[series.key], color: series.color }))}
                  valueFormatter={days.format}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}
