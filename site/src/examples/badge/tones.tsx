import { Badge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Badge>Draft</Badge>
      <Badge tone="information">In progress</Badge>
      <Badge tone="brand">Featured</Badge>
      <Badge tone="success">Completed</Badge>
      <Badge tone="warning">Payment pending</Badge>
      <Badge tone="danger">Canceled</Badge>
    </Inline>
  );
}
