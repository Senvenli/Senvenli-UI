import { Stat } from "@senvenli/react/display";

const WEEKLY_ORDERS = [112, 126, 119, 138, 151, 147, 163, 172];

export default function Example() {
  return (
    <div className="max-w-xs">
      <Stat label="Orders" value="1,128" delta={{ value: "8.1%", direction: "up" }} comparison="vs. the previous 8 weeks" trend={WEEKLY_ORDERS} />
    </div>
  );
}
