import { Separator, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-150" align="stretch">
      <Text>12 orders</Text>
      <Separator orientation="vertical" decorative />
      <Text>3 customers</Text>
      <Separator orientation="vertical" decorative />
      <Text>$1,240.00</Text>
    </Inline>
  );
}
