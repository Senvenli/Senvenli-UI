import { InputAddon, InputGroup } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <InputGroup isInvalid>
        <input aria-label="Discount" aria-invalid defaultValue="140" inputMode="numeric" className="min-w-0 flex-1 bg-transparent outline-hidden" />
        <InputAddon position="end">%</InputAddon>
      </InputGroup>
      <InputGroup size="compact" isDisabled>
        <input aria-label="Tax rate" disabled defaultValue="20" className="min-w-0 flex-1 bg-transparent outline-hidden" />
        <InputAddon position="end">%</InputAddon>
      </InputGroup>
    </Stack>
  );
}
