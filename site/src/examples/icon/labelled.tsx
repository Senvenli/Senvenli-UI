import { Icon, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-075">
      <Text>Project Atlas</Text>
      <Icon name="lock" color="subtle" label="Private project" />
    </Inline>
  );
}
