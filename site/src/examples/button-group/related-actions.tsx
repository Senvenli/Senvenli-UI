import { Button, ButtonGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ButtonGroup aria-label="Invoice actions">
      <Button iconBefore="download">Download</Button>
      <Button iconBefore="printer">Print</Button>
      <Button iconBefore="mail">Send</Button>
    </ButtonGroup>
  );
}
