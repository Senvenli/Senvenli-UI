import { Badge, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <Inline space="space-075">
        <Text>Open orders</Text>
        <Badge value={12} />
      </Inline>
      <Inline space="space-075">
        <Text>Messages</Text>
        <Badge value={128} />
      </Inline>
    </Inline>
  );
}
