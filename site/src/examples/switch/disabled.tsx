import { Stack } from "@senvenli/react/layout";
import { Switch } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Stack space="space-150">
      <Switch isDisabled defaultSelected description="Required for every member of this workspace.">
        Two-step sign-in
      </Switch>
      <Switch isDisabled description="Available on the Business plan.">
        Audit log
      </Switch>
    </Stack>
  );
}
