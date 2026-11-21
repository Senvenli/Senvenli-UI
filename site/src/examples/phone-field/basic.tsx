import { PhoneField } from "@senvenli/react/form";

export default function Example() {
  return (
    <PhoneField
      label="Phone number"
      name="phone"
      defaultCountry="US"
      suggestedCountries={["US", "CA", "GB"]}
      description="We only call about a delivery."
    />
  );
}
