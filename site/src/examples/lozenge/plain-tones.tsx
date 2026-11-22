import { Lozenge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <Lozenge appearance="plain" tone="success">Connected</Lozenge>
      <Lozenge appearance="plain" tone="information">Syncing</Lozenge>
      <Lozenge appearance="plain" tone="warning">Slow connection</Lozenge>
      <Lozenge appearance="plain" tone="danger">Offline</Lozenge>
      <Lozenge appearance="plain">Not set up</Lozenge>
    </Inline>
  );
}
