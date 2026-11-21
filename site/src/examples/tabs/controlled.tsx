import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { Tabs } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [tab, setTab] = useState<string | number>("open");
  return (
    <Stack space="space-200" align="start">
      <div className="w-full">
        <Tabs
          aria-label="Invoices"
          selectedKey={tab}
          onSelectionChange={setTab}
          items={[
            { id: "open", label: "Open", panel: <Text>18 invoices are open.</Text> },
            { id: "paid", label: "Paid", panel: <Text>1,186 invoices are paid.</Text> },
            { id: "overdue", label: "Overdue", panel: <Text>3 invoices are overdue.</Text> },
          ]}
        />
      </div>
      <Button variant="subtle" isDisabled={tab === "overdue"} onPress={() => setTab("overdue")}>
        Show overdue invoices
      </Button>
    </Stack>
  );
}
