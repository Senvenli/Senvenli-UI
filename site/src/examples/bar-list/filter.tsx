import { BarList } from "@senvenli/react/charts";
import { useState } from "react";

const COUNTRIES = [
  { id: "DE", name: "Germany", value: 4210 },
  { id: "FR", name: "France", value: 2980 },
  { id: "IT", name: "Italy", value: 2140 },
  { id: "ES", name: "Spain", value: 1620 },
  { id: "NL", name: "Netherlands", value: 980 },
  { id: "PT", name: "Portugal", value: 610 },
];
const total = COUNTRIES.reduce((sum, country) => sum + country.value, 0);
const share = new Intl.NumberFormat("en", { style: "percent" });
const count = new Intl.NumberFormat("en");

export default function Example() {
  const [selected, setSelected] = useState<string[]>(["FR"]);
  return (
    <BarList
      title="Visitors by country"
      secondaryLabel="Share"
      data={COUNTRIES.map((country) => ({ ...country, secondaryValue: share.format(country.value / total) }))}
      valueFormatter={(value) => count.format(value)}
      onRowPress={(row) => setSelected((ids) => (ids.includes(row.id!) ? ids.filter((id) => id !== row.id) : [...ids, row.id!]))}
      selectedIds={selected}
    />
  );
}
