import { Kbd, ModifierKbd, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Text>Search orders</Text>
      <Inline space="space-050">
        <ModifierKbd />
        <Kbd>K</Kbd>
      </Inline>
    </Inline>
  );
}
