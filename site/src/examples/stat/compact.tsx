import { Stat, StatGroup } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="flex w-[48rem] max-w-full flex-col gap-ds-300">
      <StatGroup label="Business">
        <Stat label="MRR" value="$12,400" delta={{ value: "6.1%", direction: "up" }} comparison="vs. October" />
        <Stat label="Paying customers" value="182" delta={{ value: "4", direction: "up" }} comparison="vs. October" />
        <Stat label="Churned" value="3" delta={{ value: "2", direction: "down", isPositive: true }} comparison="vs. October" />
      </StatGroup>
      {/* Secondary figures: up to six in a row on one surface, a smaller figure. */}
      <StatGroup label="Website" density="compact">
        <Stat label="Visitors" value="12,480" delta={{ value: "4.2%", direction: "up" }} />
        <Stat label="Page views" value="40,112" delta={{ value: "1.8%", direction: "down" }} />
        <Stat label="Bounce rate" value="41%" delta={{ value: "2.0%", direction: "down", isPositive: true }} />
        <Stat label="Visit duration" value="2m 14s" />
        <Stat label="Signups" value="96" delta={{ value: "12%", direction: "up" }} />
        <Stat label="Events" value="8,930" />
      </StatGroup>
    </div>
  );
}
