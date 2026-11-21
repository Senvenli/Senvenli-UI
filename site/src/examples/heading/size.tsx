import { Heading } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-150">
      {/* A side panel's title is an h2 in the outline, but reads at card-title size. */}
      <Heading level={2} size="heading-small">
        Order summary
      </Heading>
      <Heading level={2} size="heading-xxlarge">
        $48,920 this month
      </Heading>
    </Stack>
  );
}
