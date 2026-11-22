import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [isOpen, setOpen] = useState(false);
  return (
    <Stack direction="horizontal" space="space-150">
      {/* A plain click opens the preview here; Ctrl or Cmd click still opens the link in a new tab. */}
      <Button href="https://example.com/invoices/1042" onPress={() => setOpen(true)}>
        Preview invoice
      </Button>
      {isOpen && <Text tone="subtle">Preview opened in place.</Text>}
    </Stack>
  );
}
