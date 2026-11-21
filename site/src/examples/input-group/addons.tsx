import { InputAddon, InputGroup } from "@senvenli/react/form";

export default function Example() {
  return (
    <InputGroup dir="ltr">
      <InputAddon>https://</InputAddon>
      <input aria-label="Workspace URL" defaultValue="acme" className="min-w-0 flex-1 bg-transparent outline-hidden" />
      <InputAddon position="end">.example.com</InputAddon>
    </InputGroup>
  );
}
