import { LinkButton } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <LinkButton href="#" variant="primary" iconBefore="plus">
        Add product
      </LinkButton>
      <LinkButton href="#">View orders</LinkButton>
    </Inline>
  );
}
