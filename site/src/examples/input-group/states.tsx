import { InputAddon, InputGroup, InputGroupInput } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <InputGroup isInvalid>
        <InputGroupInput aria-label="Discount" defaultValue="140" inputMode="numeric" />
        <InputAddon position="end">%</InputAddon>
      </InputGroup>
      <InputGroup size="compact" isDisabled>
        <InputGroupInput aria-label="Tax rate" defaultValue="20" />
        <InputAddon position="end">%</InputAddon>
      </InputGroup>
    </Stack>
  );
}
