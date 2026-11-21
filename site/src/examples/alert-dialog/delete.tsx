import { Button } from "@senvenli/react/action";
import { AlertDialog, DialogTrigger } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <DialogTrigger>
      <Button variant="danger">Delete invoice</Button>
      <AlertDialog title="Delete invoice INV-2041?" confirmLabel="Delete invoice" onConfirm={() => {}}>
        The invoice and its payment history are removed for everyone on the team.
      </AlertDialog>
    </DialogTrigger>
  );
}
