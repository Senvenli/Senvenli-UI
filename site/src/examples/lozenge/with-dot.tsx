import { Lozenge } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Lozenge tone="success" hasDot>
        Online
      </Lozenge>
      <Lozenge tone="information" hasDot>
        Syncing
      </Lozenge>
    </Inline>
  );
}
