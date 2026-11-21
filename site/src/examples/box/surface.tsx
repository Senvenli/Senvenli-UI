import { Text } from "@senvenli/react/display";
import { Box, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Box padding="space-300" background="surface-sunken" radius="large">
      <Stack space="space-050">
        <Text weight="medium">Billing address</Text>
        <Text tone="subtle">1200 Market Street, Philadelphia, PA 19107</Text>
      </Stack>
    </Box>
  );
}
