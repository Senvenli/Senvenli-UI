import { Stat, StatGroup } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="w-[42rem] max-w-full">
      <StatGroup aria-label="March 2026">
        <Stat label="Revenue" value="$48,920" delta={{ value: "12.4%", direction: "up" }} comparison="vs. February" />
        {/* Fewer refunds is good news, so the fall is marked positive. */}
        <Stat label="Refunds" value="18" delta={{ value: "25%", direction: "down", isPositive: true }} comparison="vs. February" />
        <Stat label="New customers" value="312" delta={{ value: "0%", direction: "flat" }} comparison="vs. February" />
      </StatGroup>
    </div>
  );
}
