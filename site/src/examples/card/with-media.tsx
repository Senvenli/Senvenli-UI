import { Card, CardBody, CardHeader, CardMedia, Text } from "@senvenli/react/display";

// A flat placeholder photo drawn in the file, so the example needs no network.
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="hsl(30 30% 62%)"/><text x="50%" y="50%" fill="hsl(30 30% 20%)" font-family="system-ui" font-size="72" text-anchor="middle" dominant-baseline="middle">Standing desk</text></svg>`,
)}`;

export default function Example() {
  return (
    <div className="grid max-w-2xl gap-ds-200 sm:grid-cols-2">
      <Card>
        <CardMedia src={PHOTO} />
        <CardHeader title="Standing desk" subtitle="Oak, 160 cm" />
        <CardBody>
          <Text tone="subtle">24 in stock</Text>
        </CardBody>
      </Card>
      <Card>
        <CardMedia fallbackIcon="package" />
        <CardHeader title="Monitor arm" subtitle="Dual, clamp mount" />
        <CardBody>
          <Text tone="subtle">No photo yet</Text>
        </CardBody>
      </Card>
    </div>
  );
}
