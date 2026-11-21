import { Text } from "@senvenli/react/display";
import { Spinner } from "@senvenli/react/feedback";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Spinner size="small" isDecorative />
      <Text size="body-small" tone="subtle">Checking the invoice number…</Text>
    </Inline>
  );
}
