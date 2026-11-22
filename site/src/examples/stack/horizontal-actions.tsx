import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Button variant="primary">Save changes</Button>
      <Button>Preview</Button>
      <Button variant="subtle">Cancel</Button>
    </Stack>
  );
}
