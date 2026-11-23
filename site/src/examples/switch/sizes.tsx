import { Stack } from "@senvenli/react/layout";
import { Switch } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Stack space="space-150">
      <Switch size="small" defaultSelected>
        Small
      </Switch>
      <Switch defaultSelected>Medium</Switch>
      <Switch size="large" defaultSelected>
        Large
      </Switch>
    </Stack>
  );
}
