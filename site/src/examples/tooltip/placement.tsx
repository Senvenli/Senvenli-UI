import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { Tooltip } from "@senvenli/react/overlay";

const PLACEMENTS = ["top", "bottom", "start", "end"] as const;

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      {PLACEMENTS.map((placement) => (
        <Tooltip key={placement} content={`Placed at the ${placement}`} placement={placement}>
          <Button>{placement}</Button>
        </Tooltip>
      ))}
    </Stack>
  );
}
