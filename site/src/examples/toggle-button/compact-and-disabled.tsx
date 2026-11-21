import { ToggleButton, ToggleGroup } from "@senvenli/react/action";

export default function Example() {
  return (
    <ToggleGroup label="Formatting" defaultSelectedKeys={["underline"]}>
      <ToggleButton id="bold" icon="bold" size="compact">
        Bold
      </ToggleButton>
      <ToggleButton id="italic" icon="italic" size="compact">
        Italic
      </ToggleButton>
      <ToggleButton id="underline" icon="underline" size="compact" isDisabled>
        Underline
      </ToggleButton>
    </ToggleGroup>
  );
}
