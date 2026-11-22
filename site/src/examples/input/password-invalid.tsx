import { Input } from "@senvenli/react/form";

export default function Example() {
  return (
    <Input type="password"
      label="Password"
      autoComplete="current-password"
      defaultValue="orchid-ladder"
      isInvalid
      errorMessage="That password is not right. Try again or reset it."
    />
  );
}
