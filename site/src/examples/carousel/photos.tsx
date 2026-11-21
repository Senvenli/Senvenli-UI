import { Carousel } from "@senvenli/react/display";

// Flat placeholder photos drawn in the file, so the example needs no network.
const photo = (label: string, hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="hsl(${hue} 30% 62%)"/><text x="50%" y="50%" fill="hsl(${hue} 30% 20%)" font-family="system-ui" font-size="72" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  )}`;

const PHOTOS = [
  { src: photo("Front view", 210), alt: "Front view" },
  { src: photo("Side view", 150), alt: "Side view" },
  { src: photo("Detail", 30), alt: "Detail of the oak top" },
];

export default function Example() {
  return (
    <div className="max-w-xl">
      <Carousel aria-label="Product photos" items={PHOTOS} />
    </div>
  );
}
