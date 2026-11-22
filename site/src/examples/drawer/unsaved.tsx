import { Button } from "@senvenli/react/action";
import { TextArea } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { DialogTrigger, Drawer, useDrawerClose } from "@senvenli/react/overlay";
import { useState } from "react";

function SaveActions({ onSave }: { onSave: () => void }) {
  const close = useDrawerClose();
  return (
    <Stack direction="horizontal" space="space-100" justify="end">
      <Button variant="subtle" onPress={() => close()}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onPress={() => {
          onSave();
          // The parent's `hasUnsavedChanges` has not re-rendered yet: skip the question.
          close({ force: true });
        }}
      >
        Save note
      </Button>
    </Stack>
  );
}

export default function Example() {
  const [saved, setSaved] = useState("Prefers delivery before noon.");
  const [draft, setDraft] = useState(saved);
  return (
    <DialogTrigger onOpenChange={(isOpen) => isOpen && setDraft(saved)}>
      <Button>Edit note</Button>
      <Drawer
        title="Customer note"
        subtitle="Ada Lovelace"
        hasUnsavedChanges={draft !== saved}
        footer={<SaveActions onSave={() => setSaved(draft)} />}
      >
        <TextArea label="Note" description="Change the text, then try to close." value={draft} onChange={setDraft} />
      </Drawer>
    </DialogTrigger>
  );
}
