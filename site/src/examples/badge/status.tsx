import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Text weight="medium">Invoice INV-2026-0318</Text>
      <Badge tone="success">Paid</Badge>
    </Stack>
  );
}
