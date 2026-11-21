import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Button variant="primary">Save changes</Button>
      <Button>Cancel</Button>
      <Button variant="subtle">Reset filters</Button>
      <Button variant="link">Show details</Button>
      <Button variant="danger">Delete order</Button>
    </Inline>
  );
}
