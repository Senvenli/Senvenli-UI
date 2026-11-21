import { Kbd, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Text>Add a line break</Text>
      <Inline space="space-050">
        <Kbd label="Shift">⇧</Kbd>
        <Kbd label="Enter">↵</Kbd>
      </Inline>
    </Inline>
  );
}
