import { useState } from "react";
import { GridList, type GridListProps } from "@senvenli/react/collection";

const picture = (shape: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="gray" fill-opacity=".2"/>${shape}</svg>`)}`;

type Photo = { id: string; title: string; src: string };
const PHOTOS: Photo[] = [
  { id: "front", title: "Front view", src: picture('<rect x="50" y="30" width="60" height="60" rx="6" fill="gray"/>') },
  { id: "side", title: "Side view", src: picture('<rect x="65" y="25" width="30" height="70" rx="6" fill="gray"/>') },
  { id: "top", title: "From above", src: picture('<circle cx="80" cy="60" r="32" fill="gray"/>') },
  { id: "detail", title: "Detail", src: picture('<path d="M40 90 80 30l40 60z" fill="gray"/>') },
];

type Reorder = NonNullable<GridListProps<Photo>["dragAndDrop"]>["onReorder"];

export default function Example() {
  const [photos, setPhotos] = useState(PHOTOS);
  // Takes the moved tiles out, then puts them back before or after the target.
  const reorder: Reorder = (keys, target) =>
    setPhotos((current) => {
      const moved = current.filter((photo) => keys.has(photo.id));
      const rest = current.filter((photo) => !keys.has(photo.id));
      const at = rest.findIndex((photo) => photo.id === target.key) + (target.position === "after" ? 1 : 0);
      return [...rest.slice(0, at), ...moved, ...rest.slice(at)];
    });
  return (
    <GridList
      aria-label="Product photos, in display order"
      items={photos}
      dragAndDrop={{ onReorder: reorder }}
      renderItem={(photo) => {
        const index = photos.indexOf(photo);
        return {
          title: photo.title,
          meta: index === 0 ? "Cover photo" : `Photo ${index + 1}`,
          media: <img src={photo.src} alt="" />,
          actions: [
            {
              id: "earlier",
              label: `Move earlier: ${photo.title}`,
              icon: "arrow-left",
              isDisabled: index === 0,
              onPress: () => reorder(new Set([photo.id]), { key: photos[index - 1]!.id, position: "before" }),
            },
            {
              id: "later",
              label: `Move later: ${photo.title}`,
              icon: "arrow-right",
              isDisabled: index === photos.length - 1,
              onPress: () => reorder(new Set([photo.id]), { key: photos[index + 1]!.id, position: "after" }),
            },
          ],
        };
      }}
    />
  );
}
