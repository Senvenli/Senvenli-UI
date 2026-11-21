import { Icon } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-200">
      <Icon name="package" size="small" />
      <Icon name="package" />
      <Icon name="package" size="large" />
    </Inline>
  );
}
