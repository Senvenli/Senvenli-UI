import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <Input type="number" label="Payment terms" trailing="days" defaultValue={30} minValue={0} maxValue={90} description="0–90 days after the invoice date." />
      <Input type="number" label="Discount" formatOptions={{ style: "percent" }} defaultValue={0.15} minValue={0} maxValue={1} isOptional />
    </Stack>
  );
}
