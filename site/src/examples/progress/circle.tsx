import { Text } from "@senvenli/react/display";
import { ProgressCircle } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-400" align="end">
      <Stack direction="horizontal" space="space-100">
        <ProgressCircle size="small" value={40} aria-label="Uploading report" />
        <Text size="body-small" tone="subtle">Uploading 40%</Text>
      </Stack>
      <ProgressCircle value={72} label="Profile" />
      <ProgressCircle size="large" value={86} label="Seats in use" isMeasurement />
      <ProgressCircle isIndeterminate aria-label="Syncing orders" />
    </Stack>
  );
}
