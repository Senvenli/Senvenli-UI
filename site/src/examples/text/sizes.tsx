import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-100">
      <Text size="body-large">Three invoices are due this week.</Text>
      <Text>Three invoices are due this week.</Text>
      <Text size="body-small">Three invoices are due this week.</Text>
      <Text size="code">INV-2026-0318</Text>
    </Stack>
  );
}
