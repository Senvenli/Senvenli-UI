import { ResetSentCard } from "@senvenli/react/layout";

export default function Example() {
  return (
    <ResetSentCard
      className="mx-auto"
      labels={{
        title: "Check your inbox",
        description: "If an account exists for that email, we sent a link to reset the password.",
        resend: "Resend link",
        resendIn: (seconds) => `Resend in ${seconds}s`,
      }}
      onResend={() => {}}
    />
  );
}
