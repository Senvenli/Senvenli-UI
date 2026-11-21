import { Lozenge, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Text weight="medium">Invoice INV-2026-0318</Text>
      <Lozenge tone="success">Paid</Lozenge>
    </Inline>
  );
}
