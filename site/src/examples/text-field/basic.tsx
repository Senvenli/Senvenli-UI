import { TextField } from "@senvenli/react/form";

export default function Example() {
  return (
    <TextField
      label="Work email"
      type="email"
      autoComplete="email"
      placeholder="name@example.com"
      description="We send invoices and receipts here."
    />
  );
}
