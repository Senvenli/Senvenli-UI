import { Icon, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <Inline space="space-075">
        <Icon name="circle-check" color="success" />
        <Text>Payment received</Text>
      </Inline>
      <Inline space="space-075">
        <Icon name="triangle-alert" color="warning" />
        <Text>Payment pending</Text>
      </Inline>
      <Inline space="space-075">
        <Icon name="circle-x" color="danger" />
        <Text>Payment failed</Text>
      </Inline>
      <Inline space="space-075">
        <Icon name="info" color="information" />
        <Text>Refund requested</Text>
      </Inline>
    </Inline>
  );
}
