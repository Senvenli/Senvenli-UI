import { Checkbox, CheckboxGroup } from "@senvenli/react/selection";

export default function Example() {
  return (
    <CheckboxGroup label="Notify me about" description="Sent to ada@example.com." defaultValue={["orders", "invoices"]}>
      <Checkbox value="orders">New orders</Checkbox>
      <Checkbox value="invoices">Paid invoices</Checkbox>
      <Checkbox value="comments">Comments on my projects</Checkbox>
    </CheckboxGroup>
  );
}
