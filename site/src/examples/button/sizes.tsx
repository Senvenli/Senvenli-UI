import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Button size="compact">Add filter</Button>
      <Button>Add filter</Button>
      <Button size="large">Add filter</Button>
    </Inline>
  );
}
