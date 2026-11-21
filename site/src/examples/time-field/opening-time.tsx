import { Time } from "@internationalized/date";
import { TimeField } from "@senvenli/react/date";

export default function Example() {
  return <TimeField label="Opens at" defaultValue={new Time(9, 0)} />;
}
