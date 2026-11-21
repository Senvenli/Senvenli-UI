import { ColorSwatchPicker } from "@senvenli/react/color";

const PRESETS = [
  { value: "#1E63D0", name: "Ocean" },
  { value: "#0F766E", name: "Pine" },
  { value: "#7C3AED", name: "Plum" },
  { value: "#BE123C", name: "Berry" },
  { value: "#B45309", name: "Amber" },
];

export default function Example() {
  return <ColorSwatchPicker label="Label color" items={PRESETS} defaultValue="#0F766E" />;
}
