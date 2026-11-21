import { RadarChart } from "@senvenli/react/charts";

const SCORES = [
  { measure: "Quality", supplier: 8.6, average: 7.1 },
  { measure: "Delivery", supplier: 7.2, average: 7.4 },
  { measure: "Price", supplier: 6.1, average: 6.8 },
  { measure: "Support", supplier: 9.0, average: 6.5 },
  { measure: "Flexibility", supplier: 7.8, average: 6.2 },
  { measure: "Sustainability", supplier: 8.1, average: 5.9 },
];

export default function Example() {
  return (
    <RadarChart
      title="Supplier scorecard"
      period="2026 review"
      data={SCORES}
      dimension="measure"
      categories={["supplier", "average"]}
      labels={{ supplier: "Northwind Paper", average: "Supplier average" }}
      max={10}
    />
  );
}
