import { Button } from "@senvenli/react/action";
import { Heading } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-200" justify="between">
      <Heading level={3} size="heading-small">Customers</Heading>
      <Stack direction="horizontal" space="space-100">
        <Button iconBefore="download">Export</Button>
        <Button variant="primary" iconBefore="plus">Add customer</Button>
      </Stack>
    </Stack>
  );
}
