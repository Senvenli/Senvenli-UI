import { Badge, ScrollArea } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

const STAGES = ["Draft", "Submitted", "Under review", "Approved", "Scheduled", "In production", "Packed", "Shipped", "Delivered", "Closed"];

export default function Example() {
  return (
    <div className="max-w-sm">
      <ScrollArea aria-label="Order stages" orientation="horizontal">
        <Inline space="space-100" wrap={false} paddingBlock="space-100">
          {STAGES.map((stage) => (
            <Badge key={stage}>{stage}</Badge>
          ))}
        </Inline>
      </ScrollArea>
    </div>
  );
}
