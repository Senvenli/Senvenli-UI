import { StatusDot } from "@senvenli/react/feedback";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <StatusDot tone="success">Connected</StatusDot>
      <StatusDot tone="information">Syncing</StatusDot>
      <StatusDot tone="warning">Slow connection</StatusDot>
      <StatusDot tone="danger">Offline</StatusDot>
      <StatusDot>Not set up</StatusDot>
    </Inline>
  );
}
