import { Avatar, Icon, Text } from "@senvenli/react/display";
import { Inline, Pressable, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Pressable href="#customer" padding="space-150" radius="large" background="surface-sunken">
      <Inline as="span" space="space-150" justify="between" wrap={false}>
        <Inline as="span" space="space-150" wrap={false}>
          <Avatar name="Sofia Marin" src="/avatars/05.webp" />
          <Stack as="span">
            <Text weight="medium">Sofia Marin</Text>
            <Text size="body-small" tone="subtle">14 orders</Text>
          </Stack>
        </Inline>
        <Icon name="chevron-right" color="subtle" />
      </Inline>
    </Pressable>
  );
}
