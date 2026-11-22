import { Icon, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-300">
      <Stack direction="horizontal" space="space-075">
        <Icon name="circle-check" color="success" />
        <Text>Payment received</Text>
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Icon name="triangle-alert" color="warning" />
        <Text>Payment pending</Text>
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Icon name="circle-x" color="danger" />
        <Text>Payment failed</Text>
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Icon name="info" color="information" />
        <Text>Refund requested</Text>
      </Stack>
    </Stack>
  );
}
