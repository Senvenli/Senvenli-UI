import { LineChart } from "@senvenli/react/charts";

const VISITS = [
  { day: "Nov 17", visitors: 820 },
  { day: "Nov 18", visitors: 910 },
  { day: "Nov 19", visitors: 1480 },
  { day: "Nov 20", visitors: 1320 },
  { day: "Nov 21", visitors: 1190 },
  { day: "Nov 22", visitors: 1640 },
  { day: "Nov 23", visitors: 1510 },
];

export default function Example() {
  return (
    <div className="w-[40rem] max-w-full">
      {/* Each note is a dashed rule with a dot on the time axis; hover or arrow to that day for its text, or open the table. */}
      <LineChart
        title="Visitors"
        period="Last 7 days"
        data={VISITS}
        index="day"
        categories={["visitors"]}
        annotations={[
          { at: "Nov 19", label: "Release 2.0" },
          { at: "Nov 22", label: "Newsletter sent" },
        ]}
      />
    </div>
  );
}
