import { Text } from "@senvenli/react/display";
import { StatusDot } from "@senvenli/react/feedback";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-200" justify="between">
      <Text weight="medium">Payments webhook</Text>
      <StatusDot tone="success" isLive>Receiving events</StatusDot>
    </Inline>
  );
}
