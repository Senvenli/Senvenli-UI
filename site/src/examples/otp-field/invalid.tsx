import { OtpField } from "@senvenli/react/form";

export default function Example() {
  return (
    <OtpField
      label="Verification code"
      defaultValue="482917"
      isInvalid
      errorMessage="Wrong code. Enter the latest code from your email."
    />
  );
}
