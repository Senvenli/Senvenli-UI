import { LinkButton } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-100">
      <LinkButton href="#" variant="subtle" iconOnly iconBefore="settings" aria-label="Project settings" />
      <LinkButton href="#" isDisabled>
        View invoice
      </LinkButton>
    </Inline>
  );
}
