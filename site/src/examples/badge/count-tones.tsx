import { Badge, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-300">
      <Inline space="space-075">
        <Text>Drafts</Text>
        <Badge variant="count" value={4} />
      </Inline>
      <Inline space="space-075">
        <Text>New customers</Text>
        <Badge variant="count" value={7} tone="brand" />
      </Inline>
      <Inline space="space-075">
        <Text>Overdue invoices</Text>
        <Badge variant="count" value={2} tone="danger" />
      </Inline>
      <Inline space="space-075">
        <Text>Archived</Text>
        <Badge variant="count" value={31} tone="inverse" />
      </Inline>
    </Inline>
  );
}
