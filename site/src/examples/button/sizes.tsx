import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Button size="small">Add filter</Button>
      <Button>Add filter</Button>
      <Button size="large">Add filter</Button>
    </Stack>
  );
}
