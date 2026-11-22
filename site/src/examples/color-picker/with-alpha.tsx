import { ColorPicker } from "@senvenli/react/color";

export default function Example() {
  // With an alpha channel the hex has eight digits: "#0F766ECC".
  return <ColorPicker label="Highlight color" defaultValue="#0F766ECC" channels={["hue", "alpha"]} />;
}
