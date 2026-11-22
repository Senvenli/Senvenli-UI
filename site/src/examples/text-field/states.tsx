import { TextField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <TextField label="Reference" size="small" appearance="code" defaultValue="INV-2041" />
      <TextField label="Customer ID" appearance="code" defaultValue="cus_8f3k2" isReadOnly />
      <TextField label="Company" defaultValue="Analytical Engines Ltd" isDisabled />
    </Stack>
  );
}
