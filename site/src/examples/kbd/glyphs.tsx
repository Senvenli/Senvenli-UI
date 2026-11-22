import { Kbd, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Text>Add a line break</Text>
      <Stack direction="horizontal" space="space-050">
        <Kbd label="Shift">⇧</Kbd>
        <Kbd label="Enter">↵</Kbd>
      </Stack>
    </Stack>
  );
}
