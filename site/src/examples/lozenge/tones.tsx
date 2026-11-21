import { Lozenge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Lozenge>Draft</Lozenge>
      <Lozenge tone="information">In progress</Lozenge>
      <Lozenge tone="brand">Featured</Lozenge>
      <Lozenge tone="success">Completed</Lozenge>
      <Lozenge tone="warning">Payment pending</Lozenge>
      <Lozenge tone="danger">Canceled</Lozenge>
    </Inline>
  );
}
