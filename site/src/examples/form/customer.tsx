import { Button } from "@senvenli/react/action";
import { Form, FormFooter, FormRow, FormSection, Input, TextArea } from "@senvenli/react/form";

export default function Example() {
  return (
    <Form onSubmit={(event) => event.preventDefault()}>
      <FormSection legend="Contact">
        <FormRow>
          <Input label="First name" name="firstName" autoComplete="given-name" defaultValue="Ada" isRequired />
          <Input label="Last name" name="lastName" autoComplete="family-name" defaultValue="Lovelace" isRequired />
        </FormRow>
        <Input label="Email" name="email" type="email" autoComplete="email" isRequired />
        <Input type="tel" label="Phone" name="phone" defaultCountry="US" suggestedCountries={["US", "CA", "GB"]} />
      </FormSection>
      <FormSection legend="Billing">
        <Input label="Company" name="company" autoComplete="organization" />
        <TextArea label="Notes" name="notes" maxLength={200} />
      </FormSection>
      <FormFooter>
        <Button type="reset" variant="subtle">Cancel</Button>
        <Button type="submit" variant="primary">Add customer</Button>
      </FormFooter>
    </Form>
  );
}
