import { Link } from "@senvenli/react/action";
import { Avatar, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { HoverCard } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Text>
      Assigned to{" "}
      <HoverCard trigger={<Link href="#sofia">Sofia Marin</Link>}>
        <Stack direction="horizontal" space="space-150" align="start">
          <Avatar name="Sofia Marin" src="/avatars/05.webp" />
          <Stack space="space-025">
            <Text weight="medium">Sofia Marin</Text>
            <Text size="body-small" tone="subtle">Operations · Lisbon</Text>
          </Stack>
        </Stack>
      </HoverCard>
    </Text>
  );
}
