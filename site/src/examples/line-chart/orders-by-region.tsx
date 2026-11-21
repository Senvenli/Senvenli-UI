import { LineChart } from "@senvenli/react/charts";

const ORDERS = [
  { month: "Jan", north: 320, south: 210, west: 150 },
  { month: "Feb", north: 345, south: 232, west: 148 },
  { month: "Mar", north: 390, south: 228, west: 171 },
  { month: "Apr", north: 372, south: 260, west: 196 },
  { month: "May", north: 418, south: 281, west: 204 },
  { month: "Jun", north: 455, south: 276, west: 239 },
];

export default function Example() {
  return (
    <LineChart
      title="Orders"
      period="Jan–Jun 2026"
      data={ORDERS}
      index="month"
      categories={["north", "south", "west"]}
      labels={{ north: "North", south: "South", west: "West" }}
      allowDecimals={false}
    />
  );
}
