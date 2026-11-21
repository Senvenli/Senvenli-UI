import { Text } from "@senvenli/react/display";
import { Box, Container, Grid, Section, SectionHead, Stack } from "@senvenli/react/layout";

const STEPS = [
  { title: "Create a project", detail: "Name it and pick a template." },
  { title: "Invite your team", detail: "Everyone works from the same plan." },
  { title: "Send the invoice", detail: "Bill the work as soon as it is done." },
];

export default function Example() {
  return (
    <Section density="compact">
      <Container>
        <SectionHead
          overline="How it works"
          title="From first task to paid invoice"
          titleSize="heading-xxlarge"
          lead="Plan the work, track it with your team and bill it from one place."
        />
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
