import { Text } from "@senvenli/react/display";
import { Badge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-200" justify="between">
      <Text weight="medium">Payments webhook</Text>
      <Badge variant="dot" tone="success" isLive>Receiving events</Badge>
    </Stack>
  );
}
