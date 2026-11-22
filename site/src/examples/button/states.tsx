import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Button isDisabled>Send invoice</Button>
      <Button variant="primary" isPending>
        Save changes
      </Button>
    </Stack>
  );
}
