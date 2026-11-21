import { Button, ButtonGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ButtonGroup aria-label="Send" variant="split">
      <Button variant="primary">Send invoice</Button>
      <Button variant="primary" iconOnly iconBefore="chevron-down" aria-label="More send options" />
    </ButtonGroup>
  );
}
