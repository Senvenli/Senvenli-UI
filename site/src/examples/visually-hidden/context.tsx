import { Text, VisuallyHidden } from "@senvenli/react/display";

export default function Example() {
  return (
    <Text>
      <span aria-hidden>★★★★☆</span>
      <VisuallyHidden>Rated 4 out of 5</VisuallyHidden>
    </Text>
  );
}
