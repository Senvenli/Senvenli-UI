import { ProgressBar } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-300">
      <ProgressBar label="Account setup" size="large" value={3} maxValue={5} valueLabel="3 / 5 steps" />
      <ProgressBar label="Importing contacts" tone="success" value={220} maxValue={220} valueLabel="Done · 220 contacts" />
      <ProgressBar label="Importing orders" tone="danger" value={64} maxValue={180} valueLabel="Failed at 64 / 180" />
    </Stack>
  );
}
