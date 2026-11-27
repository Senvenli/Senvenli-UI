import { FunnelChart } from "@senvenli/react/charts";

const count = new Intl.NumberFormat("en");

export default function Example() {
  return (
    <div className="w-[36rem] max-w-full">
      <FunnelChart
        title="Visitor to paid"
        period="Last 30 days"
        // Website figures come from analytics, signups from the app: the two parts are not strict subsets.
        scale="max"
        valueFormatter={(value) => count.format(value)}
        steps={[
          { name: "Visitors", value: 12000, group: "Website" },
          { name: "Pricing views", value: 2400, group: "Website" },
          { name: "Signups", value: 3100, group: "Signups" },
          { name: "Trials", value: 900, group: "Signups" },
          { name: "Paid", value: 210, group: "Signups" },
        ]}
      />
    </div>
  );
}
