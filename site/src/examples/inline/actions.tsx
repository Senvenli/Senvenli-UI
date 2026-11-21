import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Button variant="primary">Save changes</Button>
      <Button>Preview</Button>
      <Button variant="subtle">Cancel</Button>
    </Inline>
  );
}
