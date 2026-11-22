import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-300">
      <Stack direction="horizontal" space="space-075">
        <Text>Drafts</Text>
        <Badge variant="count" value={4} />
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Text>New customers</Text>
        <Badge variant="count" value={7} tone="brand" />
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Text>Overdue invoices</Text>
        <Badge variant="count" value={2} tone="danger" />
      </Stack>
      <Stack direction="horizontal" space="space-075">
        <Text>Archived</Text>
        <Badge variant="count" value={31} tone="inverse" />
      </Stack>
    </Stack>
  );
}
