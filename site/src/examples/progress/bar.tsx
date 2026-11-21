import { ProgressBar } from "@senvenli/react/feedback";

export default function Example() {
  return <ProgressBar label="Importing contacts" value={142} maxValue={220} valueLabel="142 / 220" />;
}
