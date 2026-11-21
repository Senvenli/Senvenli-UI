import { Card, CardBody, CardHeader, Text } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="grid gap-ds-200 sm:grid-cols-3">
      <Card isCompact>
        <CardHeader title="Raised" />
        <CardBody>
          <Text tone="subtle">The default, on the page.</Text>
        </CardBody>
      </Card>
      <Card variant="outline" isCompact>
        <CardHeader title="Outline" />
        <CardBody>
          <Text tone="subtle">Inside cards and settings groups.</Text>
        </CardBody>
      </Card>
      <Card variant="sunken" isCompact>
        <CardHeader title="Sunken" />
        <CardBody>
          <Text tone="subtle">For summaries and code.</Text>
        </CardBody>
      </Card>
    </div>
  );
}
