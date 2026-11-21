import { Avatar } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-150">
      <Avatar name="Ada Lovelace" size="small" />
      <Avatar name="Ada Lovelace" size="medium" />
      <Avatar name="Ada Lovelace" size="large" />
    </Inline>
  );
}
