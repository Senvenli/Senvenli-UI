import { GridList, GridListItem } from "@senvenli/react/collection";
import { Avatar, Badge } from "@senvenli/react/display";

export default function Example() {
  return (
    <GridList aria-label="Customers">
      <GridListItem id="sofia" leading={<Avatar name="Sofia Marin" src="/avatars/05.webp" />} title="Sofia Marin" description="42 orders · Boston" trailing={<Badge tone="success">Active</Badge>} />
      <GridListItem id="claire" leading={<Avatar name="Claire Dubois" src="/avatars/07.webp" />} title="Claire Dubois" description="18 orders · Chicago" trailing={<Badge tone="success">Active</Badge>} />
      <GridListItem id="jamal" leading={<Avatar name="Jamal Carter" src="/avatars/08.webp" />} title="Jamal Carter" description="64 orders · Denver" trailing={<Badge tone="warning">Payment pending</Badge>} />
      <GridListItem id="lena" leading={<Avatar name="Lena Fischer" src="/avatars/02.webp" />} title="Lena Fischer" description="No orders yet · Portland" trailing={<Badge>Invited</Badge>} />
    </GridList>
  );
}
