import { Meter } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";

const THRESHOLDS = { warning: 40, critical: 48 };

export default function Example() {
  return (
    <Stack space="space-300">
      <Meter label="Storage" value={22} maxValue={50} thresholds={THRESHOLDS} valueLabel="22 / 50 GB" />
      <Meter label="Storage" value={43} maxValue={50} thresholds={THRESHOLDS} valueLabel="43 / 50 GB · almost full" />
      <Meter label="Storage" value={49} maxValue={50} thresholds={THRESHOLDS} valueLabel="49 / 50 GB · full soon" />
    </Stack>
  );
}
