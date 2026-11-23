import { Text } from "@senvenli/react/display";
import { Box } from "@senvenli/react/layout";
import { ContextMenu, ContextMenuTrigger, MenuItem, MenuSeparator } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <ContextMenu aria-label="Actions for report.pdf">
      <ContextMenuTrigger>
        <Box padding="space-200" background="surface-sunken" radius="large">
          <Text>report.pdf · right-click or long-press</Text>
        </Box>
      </ContextMenuTrigger>
      <MenuItem id="open" icon="external-link">
        Open
      </MenuItem>
      <MenuItem id="rename" icon="pencil" shortcut="F2">
        Rename
      </MenuItem>
      <MenuSeparator />
      <MenuItem id="delete" icon="trash-2" tone="danger">
        Delete
      </MenuItem>
    </ContextMenu>
  );
}
