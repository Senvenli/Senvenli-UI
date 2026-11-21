import { Button } from "@senvenli/react/action";
import { Heading, ScrollArea, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

const NOTES = Array.from({ length: 12 }, (_, index) => `Note ${index + 1}: the customer asked about delivery times.`);

export default function Example() {
  return (
    // The parent gives the height; the area takes what the header and the footer leave.
    <div className="flex h-64 max-w-sm flex-col gap-ds-150">
      <Heading level={3} size="heading-small">
        Customer notes
      </Heading>
      <ScrollArea aria-label="Customer notes" fill>
        <Stack space="space-100">
          {NOTES.map((note) => (
            <Text key={note}>{note}</Text>
          ))}
        </Stack>
      </ScrollArea>
      <Button>Add note</Button>
    </div>
  );
}
