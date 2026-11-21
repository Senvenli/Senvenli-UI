import { Sparkline } from "@senvenli/react/charts";
import { Table } from "@senvenli/react/collection";

const REGIONS = [
  { id: "north", region: "North", orders: 455, trend: [320, 345, 390, 372, 418, 455] },
  { id: "south", region: "South", orders: 276, trend: [210, 232, 228, 260, 281, 276] },
  { id: "west", region: "West", orders: 239, trend: [150, 148, 171, 196, 204, 239] },
];

export default function Example() {
  return (
    <Table
      aria-label="Orders by region"
      rows={REGIONS}
      columns={[
        { key: "region", header: "Region" },
        { key: "orders", header: "Orders in June", align: "end" },
        { key: "trend", header: "Last six months", width: "160px", render: (row) => <Sparkline data={row.trend} width={120} /> },
      ]}
    />
  );
}
