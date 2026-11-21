import { Badge, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-075">
      <Badge isDot />
      <Text>New comments on Project Atlas</Text>
    </Inline>
  );
}
