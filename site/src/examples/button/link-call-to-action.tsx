import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Button href="#" variant="primary" iconBefore="plus">
        Add product
      </Button>
      <Button href="#">View orders</Button>
    </Stack>
  );
}
