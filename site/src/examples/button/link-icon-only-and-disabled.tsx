import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Button href="#" variant="subtle" iconOnly iconBefore="settings" aria-label="Project settings" />
      <Button href="#" isDisabled>
        View invoice
      </Button>
    </Stack>
  );
}
