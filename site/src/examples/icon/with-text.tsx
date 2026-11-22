import { Icon, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-300">
      <Stack direction="horizontal" space="space-075">
        <Icon name="truck" />
        <Text>Shipped</Text>
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Icon name="calendar" />
        <Text>Due April 17</Text>
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Icon name="user" />
        <Text>Ada Lovelace</Text>
      </Stack>
    </Stack>
  );
}
