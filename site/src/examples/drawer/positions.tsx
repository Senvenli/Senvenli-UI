import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { SegmentedControl } from "@senvenli/react/navigation";
import { DialogTrigger, Drawer, type DrawerPosition } from "@senvenli/react/overlay";
import { useState } from "react";

// The edge is the app's choice, at every width: `start` and `end` mirror in right-to-left.
export default function Example() {
  const [position, setPosition] = useState<DrawerPosition>("end");
  return (
    <Stack space="space-200" align="center">
      <SegmentedControl
        label="Position"
        items={[
          { id: "start", label: "Start" },
          { id: "end", label: "End" },
          { id: "top", label: "Top" },
          { id: "bottom", label: "Bottom" },
        ]}
        value={position}
        onChange={(value) => setPosition(value as DrawerPosition)}
      />
      <DialogTrigger>
        <Button>Open the drawer</Button>
        <Drawer position={position} title="Filters">
          <Text>This drawer came in from the {position}.</Text>
        </Drawer>
      </DialogTrigger>
    </Stack>
  );
}
