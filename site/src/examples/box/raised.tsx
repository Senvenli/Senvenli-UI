import { Text } from "@senvenli/react/display";
import { Box, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Box paddingInline="space-300" paddingBlock="space-200" background="surface-raised" radius="large" shadow="raised">
      <Stack space="space-050">
        <Text weight="medium">Invoice INV-2041</Text>
        <Text tone="subtle">Due March 31, 2026</Text>
      </Stack>
    </Box>
  );
}
