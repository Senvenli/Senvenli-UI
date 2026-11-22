import { Input } from "@senvenli/react/form";

export default function Example() {
  return <Input type="number" label="Invoice amount" currency="USD" defaultValue={1248.5} minValue={0} />;
}
