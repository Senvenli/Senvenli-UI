import { Field, InputAddon, InputGroup, InputGroupInput } from "@senvenli/react/form";

export default function Example() {
  return (
    <Field label="Budget" htmlFor="budget" description="Monthly, before tax." errorMessage="Enter a budget of at least $50.">
      <InputGroup>
        <InputAddon position="start">$</InputAddon>
        <InputGroupInput inputMode="decimal" defaultValue="20" />
        <InputAddon position="end">USD</InputAddon>
      </InputGroup>
    </Field>
  );
}
