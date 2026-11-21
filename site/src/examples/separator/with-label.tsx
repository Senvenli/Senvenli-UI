import { Button } from "@senvenli/react/action";
import { Separator } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <div className="max-w-sm">
      <Stack space="space-200">
        <Button iconBefore="key-round">Continue with single sign-on</Button>
        <Separator>or continue with email</Separator>
        <Button variant="primary">Continue with email</Button>
      </Stack>
    </div>
  );
}
