import { Input } from "@senvenli/react/form";

export default function Example() {
  return (
    <Input type="password"
      label="New password"
      autoComplete="new-password"
      description="At least 10 characters, with a number and a symbol."
      showStrength
      defaultValue="orchid-ladder"
    />
  );
}
