import { Button } from "@senvenli/react/action";
import { Card, CardBody, CardHeader, Carousel, DescriptionList, ImageViewer, IsoChip, Stat, StatGroup, Timeline } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

/** A flat placeholder photo (no network): a tinted ground with a label. */
function photo(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="hsl(${hue} 30% 62%)"/><text x="50%" y="50%" fill="hsl(${hue} 30% 20%)" font-family="system-ui" font-size="72" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PHOTOS = [
  { id: "front", src: photo("Front view", 210), alt: "Front view" },
  { id: "side", src: photo("Side view", 150), alt: "Side view" },
  { id: "detail", src: photo("Detail", 30), alt: "Detail" },
];

const NOW = new Date();
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

/** The media and data display pieces: stats, a description list, a timeline, a carousel and the image viewer. */
export function MediaPreview() {
  const [viewing, setViewing] = useState(false);
  return (
    <>
      <Card>
        <CardHeader title="Stats" subtitle="Stat, StatGroup" />
        <CardBody>
          <StatGroup aria-label="This month">
            <Stat label="Revenue" value="$48,920" delta={{ value: "12%", direction: "up", isPositive: true }} comparison="vs. September" trend={[8, 9, 7, 11, 12, 14, 13, 16]} />
            <Stat label="Orders" value="1,204" delta={{ value: "3%", direction: "down", isPositive: false }} comparison="vs. September" />
            <Stat label="Refunds" value="18" />
          </StatGroup>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Details" subtitle="DescriptionList, IsoChip" />
        <CardBody>
          <DescriptionList
            items={[
              { label: "Order", value: "#1042", copyValue: "1042" },
              { label: "Customer", value: "Ada Lovelace" },
              { label: "Country", value: <span className="inline-flex items-center gap-ds-075"><IsoChip code="DE" />Germany</span> },
              { label: "Note", value: null },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Timeline" subtitle="Timeline grouped by day" />
        <CardBody>
          <Timeline
            timeZone="Europe/Berlin"
            items={[
              { id: "4", icon: "circle-check", tone: "success", title: "Order delivered", meta: "Courier", timestamp: ago(3) },
              { id: "3", icon: "truck", tone: "brand", title: "Order shipped", timestamp: ago(240) },
              { id: "2", icon: "pencil", title: "Address changed", meta: "Ada L. · from the mobile app", timestamp: ago(60 * 26) },
              { id: "1", icon: "shopping-cart", title: "Order placed", timestamp: ago(60 * 28) },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Carousel and viewer" subtitle="Carousel, ImageViewer" />
        <CardBody>
          <Stack space="space-200">
            <Carousel aria-label="Product photos" items={PHOTOS} showThumbnails isLandmark={false} />
            <div>
              <Button onPress={() => setViewing(true)}>Open viewer</Button>
            </div>
          </Stack>
          {viewing && <ImageViewer photos={PHOTOS.map((p) => p.src)} title="Product photos" alt="Product photo" onClose={() => setViewing(false)} />}
        </CardBody>
      </Card>
    </>
  );
}
