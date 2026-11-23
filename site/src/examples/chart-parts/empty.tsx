import { ChartFrame, ChartLegend, chartColor } from "@senvenli/react/charts";
import { EmptyState } from "@senvenli/react/feedback";

type Row = { id: string; region: string; days: number };
const ROWS: Row[] = [];

export default function Example() {
  return (
    <ChartFrame
      height={176}
      // The legend's row is kept (invisible) while empty or loading, so nothing jumps when data arrives.
      legend={<ChartLegend items={[{ key: "days", label: "Delivery time", color: chartColor(0) }]} />}
      emptyState={ROWS.length === 0 ? <EmptyState size="small" icon="chart-column" title="No deliveries in this period" description="Figures appear once the first order ships." /> : null}
      dataTable={{
        caption: "Average delivery time by region",
        rows: ROWS,
        columns: [
          { key: "region", header: "Region" },
          { key: "days", header: "Days", align: "end" },
        ],
      }}
    >
      {null}
    </ChartFrame>
  );
}
