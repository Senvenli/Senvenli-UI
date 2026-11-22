import { Badge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <Badge variant="dot" tone="success">Connected</Badge>
      <Badge variant="dot" tone="information">Syncing</Badge>
      <Badge variant="dot" tone="warning">Slow connection</Badge>
      <Badge variant="dot" tone="danger">Offline</Badge>
      <Badge variant="dot">Not set up</Badge>
    </Inline>
  );
}
