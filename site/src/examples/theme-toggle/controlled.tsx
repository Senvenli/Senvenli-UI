import { ThemeToggle, type ThemeChoice } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  return (
    <Inline space="space-150">
      <ThemeToggle value={choice} onChange={setChoice} />
      <Text tone="subtle">Chosen: {choice}</Text>
    </Inline>
  );
}
