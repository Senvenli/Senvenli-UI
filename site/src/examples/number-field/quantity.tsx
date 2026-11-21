import { NumberField } from "@senvenli/react/form";

export default function Example() {
  return <NumberField label="Seats" description="1–50 seats per workspace." defaultValue={5} minValue={1} maxValue={50} showStepper />;
}
