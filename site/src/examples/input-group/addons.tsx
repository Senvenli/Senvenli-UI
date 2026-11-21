import { InputAddon, InputGroup, InputGroupInput } from "@senvenli/react/form";

export default function Example() {
  return (
    <InputGroup dir="ltr">
      <InputAddon>https://</InputAddon>
      <InputGroupInput aria-label="Workspace URL" defaultValue="acme" />
      <InputAddon position="end">.example.com</InputAddon>
    </InputGroup>
  );
}
