import { ToggleButton } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [isPinned, setPinned] = useState(false);
  return (
    <Stack direction="horizontal" space="space-150">
      <ToggleButton icon="pin" isSelected={isPinned} onChange={setPinned}>
        Pin project
      </ToggleButton>
      <Text tone="subtle">{isPinned ? "Pinned to the sidebar" : "Not pinned"}</Text>
    </Stack>
  );
}
