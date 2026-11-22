import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { AlertDialog, DialogTrigger } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-100">
      <DialogTrigger>
        <Button>Change plan</Button>
        <AlertDialog tone="warning" title="Move to the Starter plan?" confirmLabel="Change plan" cancelLabel="Keep Team plan" onConfirm={() => {}}>
          Your team keeps access until March 31. After that, 14 of 20 members lose their seats.
        </AlertDialog>
      </DialogTrigger>
      <DialogTrigger>
        <Button>Reactivate account</Button>
        <AlertDialog tone="neutral" title="Reactivate Ada Lovelace's account?" confirmLabel="Reactivate account" onConfirm={() => {}}>
          She can sign in again and sees her projects as she left them.
        </AlertDialog>
      </DialogTrigger>
    </Stack>
  );
}
