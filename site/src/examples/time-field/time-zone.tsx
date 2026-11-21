import { Time } from "@internationalized/date";
import { TimeField } from "@senvenli/react/date";

export default function Example() {
  return <TimeField label="Pickup time" description="The store's local time." timeZone="Europe/Lisbon" defaultValue={new Time(10, 0)} />;
}
