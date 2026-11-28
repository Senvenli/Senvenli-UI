import { Heading, Text } from "@senvenli/react/display";

export default function Example() {
  return (
    <Heading level={2} size="display-medium">
      {/* `size="inherit"` keeps the heading's size, line height and weight; only the tone changes. */}
      Run <Text tone="brand" size="inherit">every fleet.</Text>
    </Heading>
  );
}
