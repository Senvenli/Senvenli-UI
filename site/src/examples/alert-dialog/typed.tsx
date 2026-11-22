import { Button } from "@senvenli/react/action";
import { AlertDialog, DialogTrigger } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <DialogTrigger>
      <Button variant="primary" tone="danger">Delete project</Button>
      <AlertDialog
        title="Delete the project Atlas?"
        confirmLabel="Delete project"
        requireTypedConfirmation="Atlas"
        typedConfirmationLabel="Type the project name to confirm"
        onConfirm={() => {}}
      >
        Its 48 tasks and 12 files are deleted for all 6 members. This cannot be undone.
      </AlertDialog>
    </DialogTrigger>
  );
}
