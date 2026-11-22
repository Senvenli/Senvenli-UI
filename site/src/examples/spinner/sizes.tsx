import { Spinner } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-300">
      <Spinner size="small" aria-label="Saving draft" />
      <Spinner aria-label="Checking the address" />
      <Spinner size="large" aria-label="Loading orders" />
    </Stack>
  );
}
