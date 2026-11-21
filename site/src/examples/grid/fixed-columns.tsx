import { Text } from "@senvenli/react/display";
import { Box, Grid, Stack } from "@senvenli/react/layout";

const TOTALS = [
  { label: "Orders", value: "1,284" },
  { label: "Customers", value: "312" },
  { label: "Refunds", value: "9" },
];

export default function Example() {
  return (
    <Grid columns={3} space="space-150">
      {TOTALS.map((total) => (
        <Box key={total.label} padding="space-200" background="surface-sunken" radius="large">
          <Stack space="space-050">
            <Text size="body-small" tone="subtle">{total.label}</Text>
            <Text size="body-large" weight="medium" isNumeric>{total.value}</Text>
          </Stack>
        </Box>
      ))}
    </Grid>
  );
}
