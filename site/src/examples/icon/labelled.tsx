import { Icon, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-075">
      <Text>Project Atlas</Text>
      <Icon name="lock" color="subtle" label="Private project" />
    </Stack>
  );
}
