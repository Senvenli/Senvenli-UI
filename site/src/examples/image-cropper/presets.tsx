import { Text } from "@senvenli/react/display";
import { ImageCropper } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

// A flat placeholder logo drawn in the file, so the example needs no network.
const LOGO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="hsl(150 30% 90%)"/><path d="M400 600 600 200l200 400Z" fill="hsl(150 30% 30%)"/></svg>`,
)}`;

const PRESETS = [
  { id: "cover", label: "Cover 16:9", aspectRatio: 16 / 9 },
  { id: "square", label: "Square", aspectRatio: 1 },
  // A logo must stay whole: this surface fits the image instead of filling the frame.
  { id: "logo", label: "Logo 3:1", aspectRatio: 3, fit: "contain" },
] as const;

export default function Example() {
  const [saved, setSaved] = useState<string>();
  return (
    <div className="max-w-xl">
      <Stack space="space-150">
        <ImageCropper
          src={LOGO}
          label="Company logo"
          aspectPresets={PRESETS}
          outputType="image/png"
          fileName="logo"
          onCrop={(file, result) => setSaved(`${file.name}, ${result.width} × ${result.height} px`)}
        />
        {saved && <Text tone="subtle">Saved {saved}</Text>}
      </Stack>
    </div>
  );
}
