import { InputOTP } from "@senvenli/react/form";

export default function Example() {
  return (
    <InputOTP
      label="Code from your text message"
      length={4}
      description="Sent to the number ending in 0132."
      resendCooldown={30}
      onResend={() => new Promise((resolve) => setTimeout(resolve, 800))}
    />
  );
}
