import { ToggleButton, ToggleGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ToggleGroup label="Order status" defaultSelectedKeys={["open", "overdue"]}>
      <ToggleButton id="open">Open</ToggleButton>
      <ToggleButton id="paid">Paid</ToggleButton>
      <ToggleButton id="overdue">Overdue</ToggleButton>
      <ToggleButton id="refunded">Refunded</ToggleButton>
    </ToggleGroup>
  );
}
