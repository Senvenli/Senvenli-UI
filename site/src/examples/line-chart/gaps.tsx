import { LineChart } from "@senvenli/react/charts";

// The store was closed in April: no figure, which is not the same as zero.
const VISITS = [
  { month: "Jan", store: 1240, online: 3100 },
  { month: "Feb", store: 1310, online: 3350 },
  { month: "Mar", store: 1180, online: 3600 },
  { month: "Apr", store: null, online: 3820 },
  { month: "May", store: 1420, online: 4010 },
  { month: "Jun", store: 1505, online: 4260 },
];

export default function Example() {
  return (
    <LineChart
      title="Visits"
      period="Jan–Jun 2026"
      data={VISITS}
      index="month"
      categories={["online", "store"]}
      labels={{ online: "Online", store: "In store" }}
      connectNulls
    />
  );
}
