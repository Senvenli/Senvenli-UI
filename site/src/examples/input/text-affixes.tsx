import { Icon } from "@senvenli/react/display";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <Input label="Customer" prefix={<Icon name="user" />} defaultValue="Ada Lovelace" />
      <Input label="Workspace URL" prefix="https://" suffix=".example.com" valueDir="ltr" defaultValue="acme" />
      <Input label="Hourly rate" variant="numeric" inputMode="decimal" prefix="$" suffix="per hour" defaultValue="85.00" />
    </Stack>
  );
}
