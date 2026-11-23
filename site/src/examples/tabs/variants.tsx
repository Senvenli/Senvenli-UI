import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { Tabs } from "@senvenli/react/navigation";

const items = (name: string) => [
  { id: "overview", label: "Overview", panel: <Text>{name}: the summary of this customer.</Text> },
  { id: "orders", label: "Orders", count: 12, panel: <Text>{name}: twelve orders.</Text> },
  { id: "notes", label: "Notes", panel: <Text>{name}: prefers delivery before noon.</Text> },
];

export default function Example() {
  return (
    <Stack space="space-400">
      <Tabs aria-label="Underline" items={items("Underline")} />
      <Tabs aria-label="Pills" variant="pills" items={items("Pills")} />
      <Tabs aria-label="Outline" variant="outline" size="small" items={items("Outline, small")} />
    </Stack>
  );
}
