import { ListBox } from "@senvenli/react/selection";

export default function Example() {
  return (
    <ListBox
      label="Default view"
      defaultSelectedKeys={["board"]}
      items={[
        { id: "list", label: "List", icon: "list" },
        { id: "board", label: "Board", icon: "columns-3" },
        { id: "calendar", label: "Calendar", icon: "calendar" },
      ]}
    />
  );
}
