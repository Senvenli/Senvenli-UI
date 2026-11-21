import { Button } from "@senvenli/react/action";
import { TextField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Dialog, DialogTrigger } from "@senvenli/react/overlay";
import { useState } from "react";

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button>Edit profile</Button>
      <Dialog
        title="Edit profile"
        description="Your name is shown to your team."
        primaryAction={{ label: "Save changes", onPress: () => setIsOpen(false) }}
      >
        <Stack space="space-200">
          <TextField label="Full name" defaultValue="Ada Lovelace" />
          <TextField label="Email" type="email" defaultValue="ada@example.com" />
        </Stack>
      </Dialog>
    </DialogTrigger>
  );
}
