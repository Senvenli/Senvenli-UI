import { useState } from "react";
import { ColorSwatchPicker } from "@senvenli/react/color";

const PRESETS = [
  { value: "#1E63D0", name: "Ocean" },
  { value: "#0F766E", name: "Pine" },
  { value: "#7C3AED", name: "Plum" },
];

export default function Example() {
  const [color, setColor] = useState("#1E63D0");
  return (
    <ColorSwatchPicker
      label="Theme color"
      items={PRESETS}
      value={color}
      onChange={setColor}
      allowsCustom
      description="Used for buttons and links."
    />
  );
}
