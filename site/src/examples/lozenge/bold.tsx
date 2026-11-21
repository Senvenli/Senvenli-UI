import { Lozenge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Lozenge tone="danger" appearance="bold">
        Overdue
      </Lozenge>
      <Lozenge tone="warning">Payment pending</Lozenge>
      <Lozenge tone="success">Paid</Lozenge>
    </Inline>
  );
}
