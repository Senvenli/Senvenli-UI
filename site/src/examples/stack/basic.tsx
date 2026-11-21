import { Heading, Lozenge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-150" align="start">
      <Lozenge tone="success">Paid</Lozenge>
      <Heading level={3} size="heading-small">Invoice INV-2041</Heading>
      <Text tone="subtle">Sent to Ada Lovelace on March 18, 2026.</Text>
    </Stack>
  );
}
