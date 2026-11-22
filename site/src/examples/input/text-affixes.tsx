import { Icon } from "@senvenli/react/display";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <Input label="Customer" leading={<Icon name="user" />} defaultValue="Ada Lovelace" />
      <Input label="Workspace URL" leading="https://" trailing=".example.com" valueDir="ltr" defaultValue="acme" />
      <Input label="Hourly rate" variant="numeric" inputMode="decimal" leading="$" trailing="per hour" defaultValue="85.00" />
    </Stack>
  );
}
