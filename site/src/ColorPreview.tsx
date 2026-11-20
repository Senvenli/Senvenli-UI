import { ColorField, ColorPicker, ColorSwatch, ColorSwatchPicker } from "@senvenli/react/color";
import { Card, CardBody, CardHeader } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

const PRESETS = [
  { value: "#1268AE", name: "Ocean" },
  { value: "#6E56CF", name: "Violet" },
  { value: "#2F6F4F", name: "Forest" },
  { value: "#B4391F", name: "Brick" },
  { value: "#2A2A28", name: "Graphite" },
];

/** The color family: a picker with its two-theme contrast preview, presets, a hex field and swatches. */
export function ColorPreview() {
  return (
    <>
      <Card>
        <CardHeader title="Color picker" subtitle="ColorPicker with the two-theme contrast preview" />
        <CardBody>
          <ColorPicker label="Brand color" defaultValue="#1E63D0" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Presets and fields" subtitle="ColorSwatchPicker, ColorField, ColorSwatch" />
        <CardBody>
          <Stack space="space-300">
            <ColorSwatchPicker label="Theme presets" items={PRESETS} defaultValue="#1268AE" allowsCustom />
            <ColorField label="Accent" defaultValue="#E0A100" description="Six hex digits, the # is optional." />
            <div className="flex gap-ds-100">
              {PRESETS.map((preset) => (
                <ColorSwatch key={preset.value} color={preset.value} name={preset.name} />
              ))}
            </div>
          </Stack>
        </CardBody>
      </Card>
    </>
  );
}
