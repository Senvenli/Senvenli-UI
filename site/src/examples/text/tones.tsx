import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-100">
      <Text weight="medium">Invoice INV-2026-0318</Text>
      <Text tone="subtle">Issued to Ada Lovelace</Text>
      <Text tone="subtlest" size="body-small">
        Last edited March 18, 2026
      </Text>
      <Text tone="success">Paid in full</Text>
      <Text tone="danger">Payment failed</Text>
      {/* Figures that sit in a column or change in place line up with `isNumeric`. */}
      <Text isNumeric>$1,240.00</Text>
    </Stack>
  );
}
