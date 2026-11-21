import { NumberField } from "@senvenli/react/form";

export default function Example() {
  return <NumberField label="Invoice amount" currency="USD" defaultValue={1248.5} minValue={0} />;
}
