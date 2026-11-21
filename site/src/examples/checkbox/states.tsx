import { Stack } from "@senvenli/react/layout";
import { Checkbox } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Stack space="space-150">
      <Checkbox isInvalid errorMessage="Accept the terms to continue.">
        I accept the terms of service
      </Checkbox>
      <Checkbox isDisabled>Share usage data</Checkbox>
      <Checkbox isDisabled defaultSelected description="Required by your workspace.">
        Two-step sign-in
      </Checkbox>
    </Stack>
  );
}
