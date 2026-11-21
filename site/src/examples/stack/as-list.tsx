import { Text } from "@senvenli/react/display";
import { Box, Stack } from "@senvenli/react/layout";

const STEPS = ["Order placed", "Payment received", "Order shipped"];

export default function Example() {
  return (
    <Stack as="ol" space="space-100">
      {STEPS.map((step) => (
        <Box key={step} as="li" padding="space-150" background="surface-sunken" radius="medium">
          <Text>{step}</Text>
        </Box>
      ))}
    </Stack>
  );
}
