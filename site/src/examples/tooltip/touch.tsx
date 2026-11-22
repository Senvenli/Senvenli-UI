import { Badge } from "@senvenli/react/display";
import { Tooltip } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Tooltip content="Waiting for the bank to confirm the payment" openOnTouch>
      <Badge tone="warning">Payment pending</Badge>
    </Tooltip>
  );
}
