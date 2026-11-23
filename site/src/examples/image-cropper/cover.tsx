import { Text } from "@senvenli/react/display";
import { ImageCropper } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

// A flat placeholder photo drawn in the file, so the example needs no network.
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="hsl(210 30% 62%)"/><circle cx="800" cy="600" r="320" fill="hsl(210 30% 46%)"/><text x="800" y="600" fill="hsl(210 30% 20%)" font-family="system-ui" font-size="72" text-anchor="middle" dominant-baseline="middle">Storefront</text></svg>`,
)}`;

export default function Example() {
  const [saved, setSaved] = useState<string>();
  return (
    <div className="max-w-xl">
      <Stack space="space-150">
        <ImageCropper
          src={PHOTO}
          label="Cover photo"
          fileName="cover"
          onCrop={(file, result) => setSaved(`${file.name}, ${result.width} × ${result.height} px`)}
        />
        {saved && <Text tone="subtle">Saved {saved}</Text>}
      </Stack>
    </div>
  );
}
