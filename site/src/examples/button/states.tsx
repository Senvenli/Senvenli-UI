import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Button isDisabled>Send invoice</Button>
      <Button variant="primary" isPending>
        Save changes
      </Button>
    </Inline>
  );
}
