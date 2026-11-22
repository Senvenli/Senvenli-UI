import { Badge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Badge tone="success" hasDot>
        Online
      </Badge>
      <Badge tone="information" hasDot>
        Syncing
      </Badge>
    </Inline>
  );
}
