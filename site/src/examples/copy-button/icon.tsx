import { CopyButton } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Text isNumeric>INV-2026-0318</Text>
      <CopyButton value="INV-2026-0318" aria-label="Copy the invoice number" />
    </Stack>
  );
}
