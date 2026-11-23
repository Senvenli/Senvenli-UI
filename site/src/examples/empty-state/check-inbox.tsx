import { Button } from "@senvenli/react/action";
import { EmptyState } from "@senvenli/react/feedback";
import { useCooldownAction } from "../otp-field/use-cooldown-action";

// After "Forgot your password?": the same message whether or not the account exists, and a resend that waits.
export default function Example() {
  // The first link was just sent, so the wait is already running (pass 0 when the screen shows later).
  const resend = useCooldownAction(() => new Promise((done) => setTimeout(done, 600)), 60, 60);
  return (
    <EmptyState
      icon="mail-check"
      title="Check your inbox"
      description="If an account exists for that email, we sent a link to reset the password."
      primaryAction={
        <Button isDisabled={resend.remaining > 0} isPending={resend.isPending} onPress={() => void resend.run()}>
          {resend.remaining > 0 ? `Resend in ${resend.remaining}s` : "Resend link"}
        </Button>
      }
      secondaryAction={<Button variant="subtle">Back to sign in</Button>}
    />
  );
}
