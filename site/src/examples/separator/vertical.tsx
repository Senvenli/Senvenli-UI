import { Separator, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-150" align="stretch">
      <Text>12 orders</Text>
      <Separator orientation="vertical" isDecorative />
      <Text>3 customers</Text>
      <Separator orientation="vertical" isDecorative />
      <Text>$1,240.00</Text>
    </Stack>
  );
}
