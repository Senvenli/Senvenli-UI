import { useState } from "react";
import { Card, CardBody, CardHeader, Text } from "@senvenli/react/display";
import { SegmentedControl } from "@senvenli/react/navigation";

export default function Example() {
  const [metric, setMetric] = useState<string>("visitors");
  return (
    <div className="flex w-[40rem] max-w-full flex-col gap-ds-200">
      {/* One compact control in the header: it switches what the card shows, and wraps under the title when narrow. */}
      <Card>
        <CardHeader
          title="Traffic"
          subtitle="Last 30 days"
          actions={
            <SegmentedControl
              label="Metric"
              value={metric}
              onChange={(key) => setMetric(String(key))}
              items={[
                { id: "visitors", label: "Visitors" },
                { id: "views", label: "Views" },
                { id: "bounce", label: "Bounce" },
              ]}
            />
          }
        />
        <CardBody>
          <Text tone="subtle">Chart of {metric}</Text>
        </CardBody>
      </Card>
      <div className="w-72 max-w-full">
        <Card>
          <CardHeader
            title="Traffic"
            subtitle="Narrow card"
            actions={<SegmentedControl label="Metric" defaultValue="visitors" items={[{ id: "visitors", label: "Visitors" }, { id: "views", label: "Views" }, { id: "bounce", label: "Bounce" }]} />}
          />
          <CardBody>
            <Text tone="subtle">The control sits under the title.</Text>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
