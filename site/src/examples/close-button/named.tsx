import { CloseButton } from "@senvenli/react/action";
import { Card, CardHeader } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="max-w-sm">
      <Card variant="outline" density="compact">
        <CardHeader title="Filters" subtitle="Status: paid" actions={<CloseButton aria-label="Close filters" />} />
      </Card>
    </div>
  );
}
