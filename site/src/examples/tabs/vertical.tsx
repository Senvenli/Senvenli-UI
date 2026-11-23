import { Text } from "@senvenli/react/display";
import { Tabs } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Tabs
      aria-label="Settings"
      orientation="vertical"
      variant="pills"
      items={[
        { id: "profile", label: "Profile", panel: <Text>Your name, photo and language.</Text> },
        { id: "billing", label: "Billing", panel: <Text>Plan, invoices and payment method.</Text> },
        { id: "team", label: "Team", panel: <Text>People and their roles.</Text> },
      ]}
    />
  );
}
