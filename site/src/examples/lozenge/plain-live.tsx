import { Text } from "@senvenli/react/display";
import { Lozenge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-200" justify="between">
      <Text weight="medium">Payments webhook</Text>
      <Lozenge appearance="plain" tone="success" isLive>Receiving events</Lozenge>
    </Inline>
  );
}
