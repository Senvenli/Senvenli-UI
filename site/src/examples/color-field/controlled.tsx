import { useState } from "react";
import { ColorField } from "@senvenli/react/color";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  const [color, setColor] = useState<string | null>("#0F766E");
  return (
    <Stack space="space-100">
      <ColorField label="Label color" value={color} onChange={setColor} isRequired />
      <Text size="body-small" tone="subtle">{color ? `Saved as ${color}` : "No color chosen"}</Text>
    </Stack>
  );
}
