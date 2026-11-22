import { Badge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Badge tone="danger" variant="bold">
        Overdue
      </Badge>
      <Badge tone="warning">Payment pending</Badge>
      <Badge tone="success">Paid</Badge>
    </Stack>
  );
}
