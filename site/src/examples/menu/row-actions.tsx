import { Button } from "@senvenli/react/action";
import { Menu, toast } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Menu
      aria-label="Actions for order ORD-1040"
      trigger={<Button variant="subtle" iconOnly iconBefore="ellipsis" aria-label="More actions" />}
      onAction={(id) => toast(`Action: ${id}`)}
      items={[
        { id: "edit", label: "Edit", icon: "pencil" },
        { id: "duplicate", label: "Duplicate", icon: "copy" },
        { id: "archive", label: "Archive", icon: "archive" },
        { id: "delete", label: "Delete", icon: "trash-2", tone: "danger" },
      ]}
    />
  );
}
