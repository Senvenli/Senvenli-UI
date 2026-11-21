import { Button } from "@senvenli/react/action";
import { Container, Inline, Section, SectionHead } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Section tone="sunken" density="compact">
      <Container width="narrow">
        <SectionHead
          align="center"
          title="Start your first project"
          titleSize="heading-xxlarge"
          lead="Free for 14 days. No credit card needed."
        />
        <Inline space="space-100" justify="center">
          <Button variant="primary">Start free trial</Button>
          <Button variant="subtle">Talk to sales</Button>
        </Inline>
      </Container>
    </Section>
  );
}
