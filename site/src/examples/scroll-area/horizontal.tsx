import { Badge } from "@senvenli/react/display";
import { ScrollArea } from "@senvenli/react/layout";
import { Stack } from "@senvenli/react/layout";

const STAGES = ["Draft", "Submitted", "Under review", "Approved", "Scheduled", "In production", "Packed", "Shipped", "Delivered", "Closed"];

export default function Example() {
  return (
    <div className="max-w-sm">
      <ScrollArea aria-label="Order stages" orientation="horizontal">
        <Stack direction="horizontal" space="space-100" wrap={false} paddingBlock="space-100">
          {STAGES.map((stage) => (
            <Badge key={stage}>{stage}</Badge>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}
