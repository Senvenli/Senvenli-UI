import { LinkButton } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [isOpen, setOpen] = useState(false);
  return (
    <Inline space="space-150">
      {/* A plain click opens the preview here; Ctrl or Cmd click still opens the link in a new tab. */}
      <LinkButton href="https://example.com/invoices/1042" onPress={() => setOpen(true)}>
        Preview invoice
      </LinkButton>
      {isOpen && <Text tone="subtle">Preview opened in place.</Text>}
    </Inline>
  );
}
