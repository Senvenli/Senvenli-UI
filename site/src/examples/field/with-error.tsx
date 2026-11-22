import { Field, Input } from "@senvenli/react/form";

export default function Example() {
  return (
    <Field label="Support line" isRequired errorMessage="Enter the full number with its area code: (415) 555-0132.">
      <Input type="tel" name="support-phone" defaultCountry="US" suggestedCountries={["US", "CA", "GB"]} defaultValue="+1415555" />
    </Field>
  );
}
