import { PhoneField } from "@senvenli/react/form";

export default function Example() {
  return (
    <PhoneField
      label="Phone number"
      defaultCountry="US"
      suggestedCountries={["US", "CA", "GB"]}
      defaultValue="+1415555"
      isInvalid
      errorMessage="Enter the full number with its area code: (415) 555-0132."
    />
  );
}
