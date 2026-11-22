import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { Tooltip } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-050">
      <Tooltip content="Edit">
        <Button variant="subtle" iconOnly iconBefore="pencil" aria-label="Edit" />
      </Tooltip>
      <Tooltip content="Duplicate">
        <Button variant="subtle" iconOnly iconBefore="copy" aria-label="Duplicate" />
      </Tooltip>
      <Tooltip content="Archive">
        <Button variant="subtle" iconOnly iconBefore="archive" aria-label="Archive" />
      </Tooltip>
    </Stack>
  );
}
