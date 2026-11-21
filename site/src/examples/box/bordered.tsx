import { Text } from "@senvenli/react/display";
import { Box, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Box as="section" aria-label="Order notes" padding="space-200" radius="medium" border>
      <Stack space="space-050">
        <Text weight="medium">Order notes</Text>
        <Text tone="subtle">Leave the parcel with the front desk.</Text>
      </Stack>
    </Box>
  );
}
