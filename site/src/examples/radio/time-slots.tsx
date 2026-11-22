import { RadioGroup } from "@senvenli/react/selection";

// A time-slot picker is a card group: one time per card; a taken time stays visible, disabled, and says so.
const TIMES = ["9:00", "9:30", "10:00", "10:30", "11:00", "11:30"];
const TAKEN = new Set(["9:30", "11:00"]);

export default function Example() {
  return (
    <RadioGroup
      label="Available times · March 18"
      variant="card"
      defaultValue="10:30"
      items={TIMES.map((time) => ({ value: time, label: time, description: TAKEN.has(time) ? "Taken" : undefined, isDisabled: TAKEN.has(time) }))}
    />
  );
}
