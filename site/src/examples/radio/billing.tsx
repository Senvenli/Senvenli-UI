import { RadioGroup } from "@senvenli/react/selection";

export default function Example() {
  return (
    <RadioGroup
      label="Billing period"
      defaultValue="yearly"
      items={[
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly", description: "Two months free." },
      ]}
    />
  );
}
