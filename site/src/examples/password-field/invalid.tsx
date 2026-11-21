import { PasswordField } from "@senvenli/react/form";

export default function Example() {
  return (
    <PasswordField
      label="Password"
      autoComplete="current-password"
      defaultValue="orchid-ladder"
      isInvalid
      errorMessage="That password is not right. Try again or reset it."
    />
  );
}
