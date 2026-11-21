import { ToggleButton, ToggleGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ToggleGroup label="Text alignment" selectionMode="single" defaultSelectedKeys={["left"]}>
      <ToggleButton id="left" icon="align-left">
        Left
      </ToggleButton>
      <ToggleButton id="center" icon="align-center">
        Center
      </ToggleButton>
      <ToggleButton id="right" icon="align-right">
        Right
      </ToggleButton>
    </ToggleGroup>
  );
}
