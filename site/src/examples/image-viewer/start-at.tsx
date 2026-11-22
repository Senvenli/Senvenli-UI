import { Button } from "@senvenli/react/action";
import { ImageViewer } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

// Flat placeholder photos drawn in the file, so the example needs no network.
const photo = (label: string, hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="hsl(${hue} 30% 62%)"/><text x="50%" y="50%" fill="hsl(${hue} 30% 20%)" font-family="system-ui" font-size="72" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  )}`;

const PHOTOS = [
  { label: "Front view", src: photo("Front view", 210) },
  { label: "Side view", src: photo("Side view", 150) },
  { label: "Detail", src: photo("Detail", 30) },
];

export default function Example() {
  const [openAt, setOpenAt] = useState<number | null>(null);
  return (
    <>
      <Stack direction="horizontal" space="space-100">
        {PHOTOS.map((item, index) => (
          <Button key={item.label} onPress={() => setOpenAt(index)}>
            {item.label}
          </Button>
        ))}
      </Stack>
      {openAt !== null && (
        <ImageViewer
          photos={PHOTOS.map((item) => item.src)}
          initialIndex={openAt}
          title="Standing desk"
          alt="Standing desk"
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
