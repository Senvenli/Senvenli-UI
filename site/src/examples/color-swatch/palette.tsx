import { ColorSwatch } from "@senvenli/react/color";
import { Text } from "@senvenli/react/display";
import { Inline, Stack } from "@senvenli/react/layout";

const PALETTE = [
  { name: "Ocean", value: "#1E63D0" },
  { name: "Pine", value: "#0F766E" },
  { name: "Plum", value: "#7C3AED" },
  { name: "Chalk", value: "#F4F4F2" },
];

export default function Example() {
  return (
    <Inline space="space-300">
      {PALETTE.map((color) => (
        <Inline key={color.value} space="space-100">
          <ColorSwatch color={color.value} name={color.name} />
          <Stack>
            <Text size="body-small">{color.name}</Text>
            <Text size="code" tone="subtle">{color.value}</Text>
          </Stack>
        </Inline>
      ))}
    </Inline>
  );
}
