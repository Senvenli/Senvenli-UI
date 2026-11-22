import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-300">
      <Stack direction="horizontal" space="space-075">
        <Text>Open orders</Text>
        <Badge variant="count" value={12} />
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Text>Messages</Text>
        <Badge variant="count" value={128} />
      </Stack>
    </Stack>
  );
}
