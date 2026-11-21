import { Button } from "@senvenli/react/action";
import { Menu } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Menu
      placement="bottom start"
      trigger={<Button iconAfter="chevron-down">Invoice</Button>}
      items={[
        {
          id: "edit",
          title: "Edit",
          items: [
            { id: "rename", label: "Rename", icon: "pencil", shortcut: "R" },
            { id: "duplicate", label: "Duplicate", icon: "copy", shortcut: "D" },
          ],
        },
        {
          id: "share",
          title: "Share",
          items: [
            { id: "download", label: "Download PDF", icon: "download" },
            { id: "send", label: "Send invoice (payment pending)", icon: "send", isDisabled: true },
          ],
        },
      ]}
    />
  );
}
