import { Button } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200" align="center">
      <Stack space="space-050" align="center">
        <Heading level={3} size="heading-small">Invite your team</Heading>
        <Text tone="subtle">Projects are easier with everyone in one place.</Text>
      </Stack>
      <Button variant="primary">Invite people</Button>
    </Stack>
  );
}
