import { Checkbox } from "@senvenli/react/selection";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-150">
      <Checkbox size="small" defaultSelected>
        Small
      </Checkbox>
      <Checkbox defaultSelected>Medium</Checkbox>
      <Checkbox size="large" defaultSelected>
        Large
      </Checkbox>
    </Stack>
  );
}
