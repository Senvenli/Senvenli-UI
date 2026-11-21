import { Icon } from "@senvenli/react/display";
import { TextField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <TextField label="Customer" prefix={<Icon name="user" />} defaultValue="Ada Lovelace" />
      <TextField label="Workspace URL" prefix="https://" suffix=".example.com" valueDir="ltr" defaultValue="acme" />
      <TextField label="Hourly rate" appearance="numeric" inputMode="decimal" prefix="$" suffix="per hour" defaultValue="85.00" />
    </Stack>
  );
}
