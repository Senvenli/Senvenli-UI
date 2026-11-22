import { CalendarDate } from "@internationalized/date";
import { Button } from "@senvenli/react/action";
import { DatePicker } from "@senvenli/react/date";
import { Banner } from "@senvenli/react/feedback";
import { Form, Input, TextArea } from "@senvenli/react/form";
import { Checkbox, RadioGroup, Select, Slider, Switch } from "@senvenli/react/selection";

/** Forms, every state a theme touches: fields, a picker, choices, an error and the submit row. */
export function FormsBoard() {
  return (
    <div className="grid items-start gap-ds-200 md:grid-cols-2">
      <div className="rounded-ds-large bg-ds-surface-raised p-ds-300">
        <Form onSubmit={(event) => event.preventDefault()}>
          <Input label="Full name" defaultValue="Ada Lovelace" isRequired />
          <Input label="Email" type="email" defaultValue="ada@example" errorMessage="Enter an email like name@example.com." isInvalid />
          <Input type="password" label="Password" autoComplete="new-password" showStrength />
          <Select label="Role" defaultSelectedKey="admin" items={[{ id: "admin", label: "Admin" }, { id: "member", label: "Member" }, { id: "viewer", label: "Viewer" }]} />
          <div className="flex gap-ds-100">
            <Button type="submit" variant="primary">
              Create account
            </Button>
            <Button>Cancel</Button>
          </div>
        </Form>
      </div>
      <div className="flex flex-col gap-ds-200">
        <div className="flex flex-col gap-ds-300 rounded-ds-large bg-ds-surface-raised p-ds-300">
          <DatePicker label="Start date" defaultValue={new CalendarDate(2026, 3, 18)} />
          <RadioGroup
            label="Plan"
            defaultValue="team"
            items={[
              { value: "starter", label: "Starter" },
              { value: "team", label: "Team" },
              { value: "business", label: "Business" },
            ]}
          />
          <Slider label="Seats" defaultValue={12} minValue={1} maxValue={50} />
          <Checkbox defaultSelected>Email me product updates</Checkbox>
          <Switch defaultSelected>Two-step sign-in</Switch>
          <TextArea label="Notes" defaultValue="Billing goes to the finance team." />
        </div>
        <Banner tone="information" title="Your trial ends in 7 days.">
          Add a payment method to keep your workspace.
        </Banner>
      </div>
    </div>
  );
}
