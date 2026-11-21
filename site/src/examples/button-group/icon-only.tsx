import { Button, ButtonGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ButtonGroup aria-label="History">
      <Button iconOnly iconBefore="undo-2" aria-label="Undo" />
      <Button iconOnly iconBefore="redo-2" aria-label="Redo" />
    </ButtonGroup>
  );
}
