import { Avatar, AvatarGroup } from "@senvenli/react/display";

export default function Example() {
  return (
    <AvatarGroup aria-label="Project members" max={3}>
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Alan Turing" />
      <Avatar name="Katherine Johnson" />
      <Avatar name="Edsger Dijkstra" />
    </AvatarGroup>
  );
}
