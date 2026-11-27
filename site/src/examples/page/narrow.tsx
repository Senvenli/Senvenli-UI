import { Button } from "@senvenli/react/action";
import { Form, FormSection, Input } from "@senvenli/react/form";
import { Page, PageSection } from "@senvenli/react/layout";
import { PageHeader } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Page width="narrow">
      <PageHeader title="Company" description="How your company appears on invoices." />
      <PageSection>
        <Form width="wide">
          <FormSection legend="Details">
            <Input label="Legal name" defaultValue="Acme GmbH" />
            <Input label="VAT number" defaultValue="DE123456789" />
          </FormSection>
          <div>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </Form>
      </PageSection>
    </Page>
  );
}
