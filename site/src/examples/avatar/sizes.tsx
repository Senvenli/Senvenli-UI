import { Avatar } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-150" align="center">
      <Avatar name="Daniel Reyes" src="/avatars/04.webp" size="small" />
      <Avatar name="Daniel Reyes" src="/avatars/04.webp" size="medium" />
      <Avatar name="Daniel Reyes" src="/avatars/04.webp" size="large" />
    </Stack>
  );
}
