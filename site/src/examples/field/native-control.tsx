import { Field } from "@senvenli/react/form";

export default function Example() {
  return (
    <Field label="Reminder" htmlFor="reminder-days" hint="Days before the due date that we email the customer.">
      <input id="reminder-days" type="range" min={1} max={14} defaultValue={3} className="block w-full" />
    </Field>
  );
}
