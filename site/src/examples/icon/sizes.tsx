import { Icon } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-200">
      <Icon name="package" size="small" />
      <Icon name="package" />
      <Icon name="package" size="large" />
    </Stack>
  );
}
