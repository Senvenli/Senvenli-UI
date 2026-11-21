import { Time } from "@internationalized/date";
import { TimeSlots } from "@senvenli/react/date";

// Every half hour from 9:00 to 12:30; two are already taken.
const TAKEN = [2, 5];
const SLOTS = Array.from({ length: 8 }, (_, index) => ({ time: new Time(9 + Math.floor(index / 2), (index % 2) * 30), isAvailable: !TAKEN.includes(index) }));

export default function Example() {
  return <TimeSlots label="Available times · March 18" slots={SLOTS} defaultValue={new Time(10, 30)} />;
}
