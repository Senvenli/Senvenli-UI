import { useState } from "react";
import { ColorPicker } from "@senvenli/react/color";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  const [color, setColor] = useState("#7C3AED");
  const [saved, setSaved] = useState(color);
  return (
    <Stack space="space-150">
      <ColorPicker label="Accent color" value={color} onChange={setColor} onChangeEnd={setSaved} />
      <Text size="body-small" tone="subtle">Last saved: {saved}</Text>
    </Stack>
  );
}
