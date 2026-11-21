import { Avatar } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

// A flat placeholder logo drawn in the file, so the example needs no network.
const LOGO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="hsl(150 30% 90%)"/><path d="M24 68 48 24l24 44Z" fill="hsl(150 30% 30%)"/></svg>`,
)}`;

export default function Example() {
  return (
    <Inline space="space-150">
      <Avatar name="Northwind Traders" shape="square" />
      <Avatar name="Summit Supply" shape="square" src={LOGO} />
    </Inline>
  );
}
