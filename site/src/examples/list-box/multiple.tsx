import { ListBox } from "@senvenli/react/selection";

export default function Example() {
  return (
    <ListBox
      label="Notify me about"
      selectionMode="multiple"
      defaultSelectedKeys={["orders"]}
      items={[
        { id: "orders", label: "New orders", description: "As they come in" },
        { id: "payments", label: "Payments", description: "Received and failed" },
        { id: "reviews", label: "Reviews", description: "Once a day" },
      ]}
    />
  );
}
