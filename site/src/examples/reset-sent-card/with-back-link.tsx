import { Link } from "@senvenli/react/action";
import { ResetSentCard } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [resending, setResending] = useState(false);

  async function resend() {
    setResending(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResending(false);
  }

  return (
    <ResetSentCard
      className="mx-auto"
      cooldownSeconds={10}
      resending={resending}
      onResend={resend}
      labels={{
        title: "Check your inbox",
        description: "If an account exists for that email, we sent a sign-in link. It expires in 15 minutes.",
        resend: "Resend link",
        resendIn: (seconds) => `Resend in ${seconds}s`,
      }}
      backSlot={<Link href="#sign-in" variant="subtle">Back to sign in</Link>}
    />
  );
}
