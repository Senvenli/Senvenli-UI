import { Text } from "@senvenli/react/display";
import { Pressable, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Pressable padding="space-200" radius="large" border isDisabled>
      <Stack as="span" space="space-050">
        <Text weight="medium">Enterprise</Text>
        <Text size="body-small" tone="subtle">Not available in your region yet.</Text>
      </Stack>
    </Pressable>
  );
}
