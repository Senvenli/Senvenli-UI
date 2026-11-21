import { Icon, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <Inline space="space-075">
        <Icon name="truck" />
        <Text>Shipped</Text>
      </Inline>
      <Inline space="space-075">
        <Icon name="calendar" />
        <Text>Due April 17</Text>
      </Inline>
      <Inline space="space-075">
        <Icon name="user" />
        <Text>Ada Lovelace</Text>
      </Inline>
    </Inline>
  );
}
