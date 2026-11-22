import { Fab } from "@senvenli/react/action";

export default function Example() {
  // Round and icon-only at every width; the label is still its name for screen readers and its tooltip.
  return <Fab label="New order" icon="plus" iconOnly placement="inline" onPress={() => {}} />;
}
