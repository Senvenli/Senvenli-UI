import { GridList } from "@senvenli/react/collection";

// A stand-in picture as an inline SVG data URI, so the example loads nothing from the network.
const picture = (shape: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="gray" fill-opacity=".2"/>${shape}</svg>`)}`;

const PHOTOS = [
  { id: "front", title: "Front view", size: "1.9 MB", src: picture('<rect x="50" y="30" width="60" height="60" rx="6" fill="gray"/>') },
  { id: "side", title: "Side view", size: "2.3 MB", src: picture('<rect x="65" y="25" width="30" height="70" rx="6" fill="gray"/>') },
  { id: "top", title: "From above", size: "1.4 MB", src: picture('<circle cx="80" cy="60" r="32" fill="gray"/>') },
  { id: "detail", title: "Detail", size: "3.1 MB", src: picture('<path d="M40 90 80 30l40 60z" fill="gray"/>') },
];

export default function Example() {
  return (
    <GridList
      aria-label="Product photos"
      items={PHOTOS}
      selectionMode="multiple"
      defaultSelectedKeys={["front"]}
      // The title names the tile, so the image itself needs no alt text.
      renderItem={(photo) => ({ title: photo.title, meta: photo.size, media: <img src={photo.src} alt="" /> })}
    />
  );
}
