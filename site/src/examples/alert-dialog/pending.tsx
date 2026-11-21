import { Button } from "@senvenli/react/action";
import { AlertDialog, DialogTrigger, toast } from "@senvenli/react/overlay";

// Stands in for the request; while it runs the alert cannot be cancelled.
const cancelOrder = () => new Promise<void>((resolve) => setTimeout(resolve, 1500));

export default function Example() {
  return (
    <DialogTrigger>
      <Button>Cancel order</Button>
      <AlertDialog
        tone="warning"
        title="Cancel order ORD-1040?"
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={async () => {
          await cancelOrder();
          toast.success("Order canceled", { description: "ORD-1040 · the customer was refunded" });
        }}
      >
        The customer is refunded $248.00 and gets an email about it.
      </AlertDialog>
    </DialogTrigger>
  );
}
