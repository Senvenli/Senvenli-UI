import { Button } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { Container, Stack, Section } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Section tone="sunken" density="compact" aria-labelledby="start-title">
      <Container width="narrow">
        <Stack space="space-100" align="center">
          <Heading id="start-title" level={2} size="heading-xxlarge">Start your first project</Heading>
          <Text size="body-large" tone="subtle">Free for 14 days. No credit card needed.</Text>
        </Stack>
        <Stack direction="horizontal" space="space-100" justify="center">
          <Button variant="primary">Start free trial</Button>
          <Button variant="subtle">Talk to sales</Button>
        </Stack>
      </Container>
    </Section>
  );
}
