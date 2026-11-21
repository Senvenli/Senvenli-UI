import { useState } from "react";
import { Time } from "@internationalized/date";
import { TimeSlots } from "@senvenli/react/date";

const SLOTS = [
  { time: new Time(8, 0), isAvailable: true, note: "Early · $10" },
  { time: new Time(10, 0), isAvailable: true },
  { time: new Time(12, 0), isAvailable: false, note: "Full" },
  { time: new Time(14, 0), isAvailable: true },
  { time: new Time(16, 0), isAvailable: true },
  { time: new Time(18, 0), isAvailable: true, note: "Evening · $10" },
  { time: new Time(20, 0), isAvailable: false, note: "Closed" },
];

export default function Example() {
  const [time, setTime] = useState<Time | null>(null);
  return (
    <TimeSlots
      label="Delivery window"
      slots={SLOTS}
      hourCycle={24}
      value={time}
      onChange={setTime}
      description={time ? `Arrives between ${time.hour}:00 and ${time.hour + 2}:00.` : "Each window is two hours."}
    />
  );
}
