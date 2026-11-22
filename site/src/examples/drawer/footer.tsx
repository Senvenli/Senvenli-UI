import { Button } from "@senvenli/react/action";
import { Badge, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { DialogTrigger, Drawer, toast, useDrawerClose } from "@senvenli/react/overlay";

// Rendered inside the drawer, so `useDrawerClose` reaches it.
function InvoiceActions() {
  const close = useDrawerClose();
  return (
    <Inline space="space-100" justify="end">
      <Button variant="subtle" onPress={() => close()}>
        Close
      </Button>
      <Button
        variant="primary"
        iconBefore="send"
        onPress={() => {
          toast.success("Reminder sent", { description: "INV-2038 · Northwind Traders" });
          close();
        }}
      >
        Send reminder
      </Button>
    </Inline>
  );
}

export default function Example() {
  return (
    <DialogTrigger>
      <Button>View invoice</Button>
      <Drawer
        size="large"
        title="Invoice INV-2038"
        subtitle="Northwind Traders · due March 4"
        headerActions={<Badge tone="danger">Overdue</Badge>}
        footer={<InvoiceActions />}
      >
        <Text elementType="p">$1,920.00 has been outstanding for 14 days. Two reminders were sent, the last one on March 11.</Text>
      </Drawer>
    </DialogTrigger>
  );
}
