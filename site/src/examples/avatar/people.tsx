import { Avatar } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

// A flat placeholder portrait drawn in the file, so the example needs no network.
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="hsl(210 30% 62%)"/><circle cx="48" cy="38" r="16" fill="hsl(210 30% 28%)"/><circle cx="48" cy="96" r="30" fill="hsl(210 30% 28%)"/></svg>`,
)}`;

export default function Example() {
  return (
    <Inline space="space-150">
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" src={PORTRAIT} />
      <Avatar name="Alan Turing" presence="online" />
    </Inline>
  );
}
