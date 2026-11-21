import { Button } from "@senvenli/react/action";
import { toast } from "@senvenli/react/overlay";

export default function Example() {
  return <Button onPress={() => toast.success("Order confirmed", { description: "ORD-1040 · email sent to the customer" })}>Confirm order</Button>;
}
