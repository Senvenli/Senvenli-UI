import { Heading, Text } from "@senvenli/react/display";
import { Box, Container, Grid, Section, Stack } from "@senvenli/react/layout";

const STEPS = [
  { title: "Create a project", detail: "Name it and pick a template." },
  { title: "Invite your team", detail: "Everyone works from the same plan." },
  { title: "Send the invoice", detail: "Bill the work as soon as it is done." },
];

export default function Example() {
  return (
    // The heading names the band: a landmark with a name is listed by screen readers.
    <Section density="compact" aria-labelledby="how-it-works">
      <Container>
        <Stack space="space-150">
          <Text size="body-small" weight="medium" tone="brand">How it works</Text>
          <Heading id="how-it-works" level={2} size="heading-xxlarge">From first task to paid invoice</Heading>
          <Text size="body-large" tone="subtle">Plan the work, track it with your team and bill it from one place.</Text>
        </Stack>
        <Grid minColumnWidth={200} space="space-200">
          {STEPS.map((step) => (
            <Box key={step.title} padding="space-200" background="surface-sunken" radius="large">
              <Stack space="space-050">
                <Text weight="medium">{step.title}</Text>
                <Text tone="subtle">{step.detail}</Text>
              </Stack>
            </Box>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
