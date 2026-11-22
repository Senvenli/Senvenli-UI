import { Text } from "@senvenli/react/display";
import { Sparkline } from "@senvenli/react/charts";
import { Stack } from "@senvenli/react/layout";

const WEEKLY_REVENUE = [38200, 36900, 41500, 40100, 44800, 43600, 47900, 46200, 48920];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Example() {
  // With no aria-label, the formatter writes the summary screen readers hear (first, last, low, high).
  return (
    <Stack direction="horizontal" space="space-150">
      <Text size="body-large" weight="medium" isNumeric>{usd.format(48920)}</Text>
      <Sparkline data={WEEKLY_REVENUE} width={220} height={48} valueFormatter={usd.format} />
    </Stack>
  );
}
