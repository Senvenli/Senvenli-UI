import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Dialog, DialogTrigger, useDialogClose } from "@senvenli/react/overlay";
import { Checkbox } from "@senvenli/react/selection";

function Footer() {
  const close = useDialogClose();
  return (
    <div className="flex w-full flex-wrap items-center gap-ds-100">
      <div className="me-auto">
        <Checkbox>Don't show this again</Checkbox>
      </div>
      <Button variant="subtle" onPress={close}>
        Later
      </Button>
      <Button variant="primary" onPress={close}>
        Take the tour
      </Button>
    </div>
  );
}

export default function Example() {
  return (
    <DialogTrigger>
      <Button>What's new</Button>
      <Dialog title="What's new" description="Three things changed this month." footer={<Footer />}>
        <Text>Saved views, a faster search and dark mode for everyone.</Text>
      </Dialog>
    </DialogTrigger>
  );
}
