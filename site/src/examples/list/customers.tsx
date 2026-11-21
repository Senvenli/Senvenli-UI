import { List, ListItem } from "@senvenli/react/collection";
import { Avatar, Lozenge } from "@senvenli/react/display";

export default function Example() {
  return (
    <List aria-label="Customers">
      <ListItem id="ada" leading={<Avatar name="Ada Lovelace" />} title="Ada Lovelace" description="42 orders · Boston" trailing={<Lozenge tone="success">Active</Lozenge>} />
      <ListItem id="grace" leading={<Avatar name="Grace Hopper" />} title="Grace Hopper" description="18 orders · Chicago" trailing={<Lozenge tone="success">Active</Lozenge>} />
      <ListItem id="alan" leading={<Avatar name="Alan Turing" />} title="Alan Turing" description="64 orders · Denver" trailing={<Lozenge tone="warning">Payment pending</Lozenge>} />
      <ListItem id="katherine" leading={<Avatar name="Katherine Johnson" />} title="Katherine Johnson" description="No orders yet · Portland" trailing={<Lozenge>Invited</Lozenge>} />
    </List>
  );
}
