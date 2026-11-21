import { SearchField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-200">
      <SearchField label="Search invoices" placeholder="Number, customer or amount" shortcut="/" />
      <SearchField aria-label="Search projects" placeholder="Project name" size="compact" />
    </Stack>
  );
}
