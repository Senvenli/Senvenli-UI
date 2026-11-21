import { Button } from "@senvenli/react/action";
import { Menu } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Menu
      placement="bottom start"
      trigger={<Button iconAfter="chevron-down">Project</Button>}
      items={[
        { id: "open", label: "Open", icon: "folder-open" },
        {
          id: "move",
          label: "Move to",
          icon: "folder-input",
          children: [
            { id: "move-design", label: "Design" },
            { id: "move-engineering", label: "Engineering" },
            { id: "move-archive", label: "Archive" },
          ],
        },
        { id: "export", label: "Export", icon: "download" },
      ]}
    />
  );
}
