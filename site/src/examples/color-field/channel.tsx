import { useState } from "react";
import { ColorField, ColorSwatch } from "@senvenli/react/color";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  const [color, setColor] = useState<string | null>("#1E63D0");
  return (
    <Inline space="space-150" align="end">
      {/* Both fields edit the same hex: each one reads and writes its own channel of it. */}
      <ColorField label="Hue" channel="hue" value={color} onChange={setColor} />
      <ColorField label="Saturation" channel="saturation" value={color} onChange={setColor} />
      {color && <ColorSwatch color={color} name="Result" />}
    </Inline>
  );
}
