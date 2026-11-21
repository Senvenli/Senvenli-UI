import { TextField } from "@senvenli/react/form";

export default function Example() {
  return (
    <TextField
      label="Work email"
      type="email"
      defaultValue="ada@example"
      isInvalid
      errorMessage="Enter a valid email: name@example.com"
    />
  );
}
