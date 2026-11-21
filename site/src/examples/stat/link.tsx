import { Stat } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="max-w-xs">
      <Stat label="Open invoices" value="$12,480" delta={{ value: "4.2%", direction: "up", isPositive: false }} comparison="vs. February" href="#" />
    </div>
  );
}
