import { GridList, GridListItem } from "@senvenli/react/collection";
import { Avatar } from "@senvenli/react/display";

export default function Example() {
  // The arrow keys move the selection with the focus, as in an inbox.
  return (
    <GridList aria-label="Conversations" selectionMode="single" selectionBehavior="replace" defaultSelectedKeys={["ada"]}>
      <GridListItem id="sofia" leading={<Avatar name="Sofia Marin" src="/avatars/05.webp" size="small" />} title="Sofia Marin" description="Where is my order?" />
      <GridListItem id="claire" leading={<Avatar name="Claire Dubois" src="/avatars/07.webp" size="small" />} title="Claire Dubois" description="Thanks, that fixed it." />
      <GridListItem id="jamal" leading={<Avatar name="Jamal Carter" src="/avatars/08.webp" size="small" />} title="Jamal Carter" description="Can I change the delivery address?" />
    </GridList>
  );
}
