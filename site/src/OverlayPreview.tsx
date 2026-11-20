import { Button } from "@senvenli/react/action";
import { Card, CardBody, CardHeader, Text } from "@senvenli/react/display";
import { TextField } from "@senvenli/react/form";
import { Inline, Stack } from "@senvenli/react/layout";
import { AlertDialog, Dialog, Drawer, Menu, Popover, Tooltip, toast } from "@senvenli/react/overlay";
import { useState } from "react";

/** Overlays need open state, so they get their own demo card. */
export function OverlayPreview() {
  const [dialog, setDialog] = useState(false);
  const [alert, setAlert] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return (
    <Card>
      <CardHeader title="Overlays" subtitle="Dialog, AlertDialog, Drawer, Popover, Tooltip, Menu, toast" />
      <CardBody>
        <Stack space="space-200">
          <Inline space="space-100">
            <Button onPress={() => setDialog(true)}>Edit profile</Button>
            <Button variant="danger" onPress={() => setAlert(true)}>
              Delete project
            </Button>
            <Button onPress={() => setDrawer(true)}>Open details</Button>
          </Inline>
          <Inline space="space-100" align="center">
            <Popover trigger={<Button>Filters</Button>} title="Filters">
              <Text>Show only active projects.</Text>
            </Popover>
            <Tooltip content="Settings">
              <Button iconOnly iconBefore="settings" aria-label="Settings" />
            </Tooltip>
            <Menu
              aria-label="Project actions"
              trigger={<Button iconOnly iconBefore="ellipsis" aria-label="More actions" />}
              items={[
                { id: "edit", label: "Edit", icon: "pencil", shortcut: "E" },
                { id: "share", label: "Share", icon: "share-2" },
                { id: "delete", label: "Delete", icon: "trash-2", tone: "danger" },
              ]}
            />
            <Button onPress={() => toast.success("Changes saved")}>Show toast</Button>
          </Inline>
        </Stack>
        <Dialog
          isOpen={dialog}
          onOpenChange={setDialog}
          title="Edit profile"
          description="Your name is shown to your team."
          primaryAction={{ label: "Save changes", onPress: () => setDialog(false) }}
        >
          <Stack space="space-200">
            <TextField label="Full name" defaultValue="Ada Lovelace" />
            <TextField label="Email" type="email" defaultValue="ada@example.com" />
          </Stack>
        </Dialog>
        <AlertDialog
          isOpen={alert}
          onOpenChange={setAlert}
          tone="danger"
          title="Delete this project?"
          confirmLabel="Delete project"
          onConfirm={() => setAlert(false)}
        >
          Its tasks and files are removed for everyone. This cannot be undone.
        </AlertDialog>
        <Drawer isOpen={drawer} onOpenChange={setDrawer} title="Project details" subtitle="Updated 2 minutes ago">
          <Text>Owner: Ada Lovelace</Text>
        </Drawer>
      </CardBody>
    </Card>
  );
}
