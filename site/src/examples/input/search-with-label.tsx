import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <Input type="search" label="Search invoices" placeholder="Number, customer or amount" shortcut="/" />
      <Input type="search" aria-label="Search projects" placeholder="Project name" size="small" />
    </Stack>
  );
}
