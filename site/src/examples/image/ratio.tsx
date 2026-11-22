import { Image } from "@senvenli/react/display";
import { Grid } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Grid columns={3} space="space-150">
      <Image src="/avatars/03.webp" alt="Marco smiling, in a blue shirt" ratio="1/1" />
      <Image src="/avatars/05.webp" alt="Sofia in a white blazer" ratio="4/3" radius="large" />
      <Image src="/avatars/07.webp" alt="Claire with long brown hair" ratio="16/9" radius="none" />
    </Grid>
  );
}
