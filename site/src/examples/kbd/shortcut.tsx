import { Kbd, ModifierKbd, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Text>Search orders</Text>
      <Stack direction="horizontal" space="space-050">
        <ModifierKbd />
        <Kbd>K</Kbd>
      </Stack>
    </Stack>
  );
}
