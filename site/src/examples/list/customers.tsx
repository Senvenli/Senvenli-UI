import { List, ListItem } from "@senvenli/react/collection";
import { Avatar, Lozenge } from "@senvenli/react/display";

export default function Example() {
  return (
    <List aria-label="Customers">
      <ListItem id="sofia" leading={<Avatar name="Sofia Marin" src="/avatars/05.webp" />} title="Sofia Marin" description="42 orders · Boston" trailing={<Lozenge tone="success">Active</Lozenge>} />
      <ListItem id="claire" leading={<Avatar name="Claire Dubois" src="/avatars/07.webp" />} title="Claire Dubois" description="18 orders · Chicago" trailing={<Lozenge tone="success">Active</Lozenge>} />
      <ListItem id="jamal" leading={<Avatar name="Jamal Carter" src="/avatars/08.webp" />} title="Jamal Carter" description="64 orders · Denver" trailing={<Lozenge tone="warning">Payment pending</Lozenge>} />
      <ListItem id="lena" leading={<Avatar name="Lena Fischer" src="/avatars/02.webp" />} title="Lena Fischer" description="No orders yet · Portland" trailing={<Lozenge>Invited</Lozenge>} />
    </List>
  );
}
