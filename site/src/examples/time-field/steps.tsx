import { Time } from "@internationalized/date";
import { TimeField } from "@senvenli/react/date";

export default function Example() {
  return (
    <TimeField
      label="Delivery cutoff"
      description="Orders placed later ship the next day."
      hourCycle={24}
      minuteStep={15}
      defaultValue={new Time(16, 30)}
      minValue={new Time(12, 0)}
      maxValue={new Time(20, 0)}
    />
  );
}
