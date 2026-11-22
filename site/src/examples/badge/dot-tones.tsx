import { Badge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-300">
      <Badge variant="dot" tone="success">Connected</Badge>
      <Badge variant="dot" tone="information">Syncing</Badge>
      <Badge variant="dot" tone="warning">Slow connection</Badge>
      <Badge variant="dot" tone="danger">Offline</Badge>
      <Badge variant="dot">Not set up</Badge>
    </Stack>
  );
}
