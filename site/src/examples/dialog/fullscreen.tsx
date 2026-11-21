import { Button } from "@senvenli/react/action";
import { TextField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Dialog, DialogTrigger } from "@senvenli/react/overlay";
import { useState } from "react";

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button>Create workspace</Button>
      <Dialog
        size="fullscreen"
        footerLayout="spread"
        title="Create a workspace"
        description="Step 1 of 3 · Name and address"
        secondaryAction={{ label: "Back", iconBefore: "arrow-left", onPress: close }}
        primaryAction={{ label: "Continue", iconAfter: "arrow-right", onPress: close }}
      >
        <div className="mx-auto w-full max-w-120">
          <Stack space="space-200">
            <TextField label="Workspace name" defaultValue="Analytical Engines" />
            <TextField label="Web address" defaultValue="analytical-engines" description="Lowercase letters, numbers and hyphens." />
          </Stack>
        </div>
      </Dialog>
    </DialogTrigger>
  );
}
