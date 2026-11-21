import { Stack } from "@senvenli/react/layout";
import { Slider } from "@senvenli/react/selection";

export default function Example() {
  return (
    <div className="max-w-80">
      <Stack space="space-300">
        <Slider label="Discount" defaultValue={0.15} maxValue={0.5} step={0.05} formatOptions={{ style: "percent" }} />
        <Slider label="Storage used" description="Managed by your plan." defaultValue={72} formatOptions={{ style: "unit", unit: "gigabyte" }} isDisabled />
      </Stack>
    </div>
  );
}
