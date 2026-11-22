import { Badge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Badge tone="success" hasDot>
        Online
      </Badge>
      <Badge tone="information" hasDot>
        Syncing
      </Badge>
    </Stack>
  );
}
