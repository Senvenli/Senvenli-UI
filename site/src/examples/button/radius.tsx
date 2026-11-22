import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

// `radius` on one component; `<DesignSystemProvider defaults={{ radius: "full" }}>` sets it for the whole app.
export default function Example() {
  return (
    <Stack direction="horizontal" space="space-150">
      <Button radius="none">None</Button>
      <Button radius="small">Small</Button>
      <Button>Medium</Button>
      <Button radius="large">Large</Button>
      <Button radius="full">Full</Button>
    </Stack>
  );
}
