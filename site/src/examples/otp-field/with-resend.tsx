import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { useCooldownAction } from "./use-cooldown-action";
import { OtpField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";

// The field takes the code; "Send again" is a Button with useCooldownAction, which waits after each send and starts
// no wait (and says so) when a send fails.
export default function Example() {
  // The first code was just sent, so the 30-second wait is already running.
  const resend = useCooldownAction(() => new Promise((done) => setTimeout(done, 800)), 30, 30);
  return (
    <Stack space="space-150">
      <OtpField label="Code from your text message" length={4} description="Sent to the number ending in 0132." />
      <Stack space="space-050">
        <div>
          <Button size="small" variant="subtle" isDisabled={resend.remaining > 0} isPending={resend.isPending} onPress={() => void resend.run()}>
            {resend.remaining > 0 ? `Send again in 0:${String(resend.remaining).padStart(2, "0")}` : "Send again"}
          </Button>
        </div>
        <span role="status">{resend.failed && <Text size="body-small" tone="danger">The code was not sent. Try again.</Text>}</span>
      </Stack>
    </Stack>
  );
}
