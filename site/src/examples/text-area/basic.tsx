import { TextArea } from "@senvenli/react/form";

export default function Example() {
  return (
    <TextArea
      label="Notes for the customer"
      placeholder="Payment terms, delivery details…"
      description="Shown at the bottom of the invoice."
      isOptional
    />
  );
}
