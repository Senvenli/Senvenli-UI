import { Separator, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <Stack space="space-050">
        <Text weight="medium">Billing address</Text>
        <Text tone="subtle">12 St James's Square, London</Text>
      </Stack>
      <Separator />
      <Stack space="space-050">
        <Text weight="medium">Shipping address</Text>
        <Text tone="subtle">Same as the billing address</Text>
      </Stack>
    </Stack>
  );
}
