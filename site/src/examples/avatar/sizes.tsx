import { Avatar } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-150" align="center">
      <Avatar name="Daniel Reyes" src="/avatars/04.webp" size="small" />
      <Avatar name="Daniel Reyes" src="/avatars/04.webp" size="medium" />
      <Avatar name="Daniel Reyes" src="/avatars/04.webp" size="large" />
    </Inline>
  );
}
