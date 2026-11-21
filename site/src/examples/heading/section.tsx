import { Heading, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-100">
      <Heading level={2}>Billing</Heading>
      <Text elementType="p" tone="subtle">
        Invoices are issued on the first day of each month and sent to the account owner.
      </Text>
    </Stack>
  );
}
