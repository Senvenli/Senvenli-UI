import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { Disclosure } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <Stack space="space-100">
      <Disclosure title="Advanced settings" isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
        Requests time out after 30 seconds and are retried three times.
      </Disclosure>
      <Text size="body-small" tone="subtle">
        The section is {isExpanded ? "open" : "closed"}.
      </Text>
    </Stack>
  );
}
