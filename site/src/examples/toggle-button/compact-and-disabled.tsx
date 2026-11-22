import { ToggleButton, ToggleGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ToggleGroup label="Formatting" defaultSelectedKeys={["underline"]}>
      <ToggleButton id="bold" icon="bold" size="small">
        Bold
      </ToggleButton>
      <ToggleButton id="italic" icon="italic" size="small">
        Italic
      </ToggleButton>
      <ToggleButton id="underline" icon="underline" size="small" isDisabled>
        Underline
      </ToggleButton>
    </ToggleGroup>
  );
}
