import { Card, CardBody, CardHeader, Lozenge, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <div className="max-w-sm">
      <Card href="#">
        <CardHeader title="Project Atlas" subtitle="Website redesign" />
        <CardBody>
          <Inline space="space-100">
            <Lozenge tone="information">In progress</Lozenge>
            <Text tone="subtle">12 open tasks</Text>
          </Inline>
        </CardBody>
      </Card>
    </div>
  );
}
