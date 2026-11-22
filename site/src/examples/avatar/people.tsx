import { Avatar } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-150">
      <Avatar name="Amara Okafor" src="/avatars/01.webp" />
      {/* No photo: the initials, on a color picked from the name. */}
      <Avatar name="Lena Fischer" />
      <Avatar name="Marco Bellini" src="/avatars/03.webp" presence="online" />
    </Stack>
  );
}
