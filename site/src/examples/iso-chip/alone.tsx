import { IsoChip, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <Text>Ships from</Text>
      <span role="img" aria-label="Germany">
        <IsoChip code="DE" />
      </span>
    </Inline>
  );
}
