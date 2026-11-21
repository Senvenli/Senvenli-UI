import { InputOTP } from "@senvenli/react/form";

export default function Example() {
  return (
    <InputOTP
      label="Verification code"
      defaultValue="482917"
      isInvalid
      errorMessage="Wrong code. Enter the latest code from your email."
    />
  );
}
