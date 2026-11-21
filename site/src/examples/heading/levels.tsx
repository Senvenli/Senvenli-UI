import { Heading } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-150">
      <Heading level={2}>Customers</Heading>
      <Heading level={3}>Recent orders</Heading>
      <Heading level={4}>Shipping address</Heading>
      <Heading level={5}>Delivery notes</Heading>
    </Stack>
  );
}
