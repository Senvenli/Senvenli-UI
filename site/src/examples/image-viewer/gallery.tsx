import { Button } from "@senvenli/react/action";
import { ImageViewer } from "@senvenli/react/display";
import { useState } from "react";

// Flat placeholder photos drawn in the file, so the example needs no network.
const photo = (label: string, hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="hsl(${hue} 30% 62%)"/><text x="50%" y="50%" fill="hsl(${hue} 30% 20%)" font-family="system-ui" font-size="72" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  )}`;

const PHOTOS = [
  { src: photo("Front view", 210), alt: "The standing desk from the front" },
  { src: photo("Side view", 150), alt: "The desk from the side, raised" },
  { src: photo("Detail", 30), alt: "The height controls up close" },
];

export default function Example() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button iconBefore="images" onPress={() => setOpen(true)}>
        View photos
      </Button>
      <ImageViewer items={PHOTOS} title="Standing desk" isOpen={isOpen} onOpenChange={setOpen} />
    </>
  );
}
