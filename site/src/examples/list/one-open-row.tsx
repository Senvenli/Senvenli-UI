import { List, ListItem } from "@senvenli/react/collection";
import { Avatar } from "@senvenli/react/display";

export default function Example() {
  // The arrow keys move the selection with the focus, as in an inbox.
  return (
    <List aria-label="Conversations" selectionMode="single" selectionBehavior="replace" defaultSelectedKeys={["ada"]}>
      <ListItem id="ada" leading={<Avatar name="Ada Lovelace" size="small" />} title="Ada Lovelace" description="Where is my order?" />
      <ListItem id="grace" leading={<Avatar name="Grace Hopper" size="small" />} title="Grace Hopper" description="Thanks, that fixed it." />
      <ListItem id="alan" leading={<Avatar name="Alan Turing" size="small" />} title="Alan Turing" description="Can I change the delivery address?" />
    </List>
  );
}
