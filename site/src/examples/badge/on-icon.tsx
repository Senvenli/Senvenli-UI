import { Button } from "@senvenli/react/action";
import { Badge, BadgeAnchor } from "@senvenli/react/display";

export default function Example() {
  return (
    <BadgeAnchor>
      {/* On an icon the cap is 9, and the label says what the badge shows. */}
      <Button iconOnly iconBefore="bell" aria-label="Notifications, 9+ unread" />
      <Badge isOnIcon value={12} tone="brand" />
    </BadgeAnchor>
  );
}
