import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Box } from "@senvenli/react/layout";
import { ContextMenu } from "@senvenli/react/overlay";
import { useState } from "react";

export default function Example() {
  const [last, setLast] = useState("nothing yet");
  return (
    <ContextMenu
      aria-label="Actions for ORD-482"
      items={[
        { id: "open", label: "Open", icon: "external-link" },
        { id: "duplicate", label: "Duplicate", icon: "copy" },
        { id: "delete", label: "Delete", icon: "trash-2", tone: "danger" },
      ]}
      onAction={(id) => setLast(String(id))}
    >
      <Box padding="space-200" background="surface-sunken" radius="large">
        <Button variant="subtle">ORD-482 · Jordan Lee</Button>
        <Text size="body-small" tone="subtle">Last action: {last}</Text>
      </Box>
    </ContextMenu>
  );
}
