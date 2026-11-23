import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-075">
      <Badge variant="count" />
      <Text>New comments on Project Atlas</Text>
    </Stack>
  );
}
