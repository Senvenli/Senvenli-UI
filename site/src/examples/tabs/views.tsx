import { Text } from "@senvenli/react/display";
import { Tabs } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Tabs
      aria-label="Customer"
      items={[
        { id: "overview", label: "Overview", panel: <Text>Ada Lovelace has been a customer since March 2024.</Text> },
        { id: "orders", label: "Orders", count: 12, panel: <Text>12 orders, the latest on March 18.</Text> },
        { id: "invoices", label: "Invoices", count: 2, panel: <Text>2 invoices are awaiting payment.</Text> },
        { id: "notes", label: "Notes", panel: <Text>Prefers delivery before noon.</Text> },
      ]}
    />
  );
}
