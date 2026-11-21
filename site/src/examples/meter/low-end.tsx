import { Meter } from "@senvenli/react/feedback";

export default function Example() {
  return (
    <Meter
      label="Email credits"
      value={150}
      maxValue={1200}
      segments={12}
      badEnd="low"
      thresholds={{ warning: 300, critical: 100 }}
      valueLabel="150 of 1,200 left · top up soon"
    />
  );
}
