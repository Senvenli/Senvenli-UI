import { Button } from "@senvenli/react/action";
import { Tooltip } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Tooltip content="Filter" shortcut="F">
      <Button iconOnly iconBefore="list-filter" aria-label="Filter" />
    </Tooltip>
  );
}
