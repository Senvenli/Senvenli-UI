import { Avatar, AvatarGroup } from "@senvenli/react/display";

export default function Example() {
  return (
    <AvatarGroup aria-label="Project members" max={3}>
      <Avatar name="Amara Okafor" src="/avatars/01.webp" />
      <Avatar name="Marco Bellini" src="/avatars/03.webp" />
      <Avatar name="Claire Dubois" src="/avatars/07.webp" />
      <Avatar name="Omar Haddad" src="/avatars/06.webp" />
      <Avatar name="Sofia Marin" src="/avatars/05.webp" />
    </AvatarGroup>
  );
}
