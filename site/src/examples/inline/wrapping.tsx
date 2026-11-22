import { Badge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

const STATUSES = [
  { label: "Draft", tone: "neutral" },
  { label: "In progress", tone: "information" },
  { label: "Under review", tone: "warning" },
  { label: "Completed", tone: "success" },
  { label: "Canceled", tone: "danger" },
] as const;

export default function Example() {
  return (
    <Inline space="space-100">
      {STATUSES.map((status) => (
        <Badge key={status.label} tone={status.tone}>{status.label}</Badge>
      ))}
    </Inline>
  );
}
