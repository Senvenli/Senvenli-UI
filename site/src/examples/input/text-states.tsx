import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <Input label="Reference" size="small" appearance="code" defaultValue="INV-2041" />
      <Input label="Customer ID" appearance="code" defaultValue="cus_8f3k2" isReadOnly />
      <Input label="Company" defaultValue="Analytical Engines Ltd" isDisabled />
    </Stack>
  );
}
