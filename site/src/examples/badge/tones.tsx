import { Badge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Badge>Draft</Badge>
      <Badge tone="information">In progress</Badge>
      <Badge tone="brand">Featured</Badge>
      <Badge tone="success">Completed</Badge>
      <Badge tone="warning">Payment pending</Badge>
      <Badge tone="danger">Canceled</Badge>
    </Stack>
  );
}
