import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Button variant="primary" iconBefore="plus">
        New order
      </Button>
      <Button iconAfter="chevron-down">Export</Button>
      {/* Without a visible label, the name comes from `aria-label`. */}
      <Button iconOnly iconBefore="settings" aria-label="Settings" />
    </Inline>
  );
}
