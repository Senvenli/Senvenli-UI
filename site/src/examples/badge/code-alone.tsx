import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <Text>Ships from</Text>
      <span role="img" aria-label="Germany">
        <Badge>DE</Badge>
      </span>
    </Stack>
  );
}
