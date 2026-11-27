import { Stat, StatGroup } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="w-[42rem] max-w-full">
      <StatGroup label="Business" selectionMode="single" defaultSelectedKeys={["mrr"]} disallowEmptySelection>
        <Stat
          id="mrr"
          label="MRR"
          period="now"
          value="$12,400"
          delta={{ value: "6.1%", direction: "up" }}
          comparison="vs. 30 days ago"
          help="Monthly recurring revenue: every active paid plan, yearly ones divided by twelve. Trials and one-off charges are left out."
        />
        <Stat
          id="customers"
          label="Paying customers"
          period="now"
          value="182"
          delta={{ value: "4", direction: "up" }}
          comparison="vs. 30 days ago"
          help="Accounts with at least one active paid plan."
        />
        <Stat id="churn" label="Churned" period="this month" value="3" delta={{ value: "2", direction: "down", isPositive: true }} comparison="vs. October" />
      </StatGroup>
    </div>
  );
}
