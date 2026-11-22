import { Input } from "@senvenli/react/form";

export default function Example() {
  return (
    <Input type="tel"
      label="Phone number"
      name="phone"
      defaultCountry="US"
      suggestedCountries={["US", "CA", "GB"]}
      description="We only call about a delivery."
    />
  );
}
