import * as React from "react";
import { Button } from "@senvenli/react/action";
import { Switch } from "@senvenli/react/selection";
import { Stack } from "@senvenli/react/layout";
import { Tour } from "@senvenli/react/overlay";

export default function Example() {
  const [open, setOpen] = React.useState(false);
  const toggle = React.useRef<HTMLDivElement>(null);
  return (
    <Stack space="space-300">
      <div ref={toggle} className="self-start">
        <Switch>Email me a daily summary</Switch>
      </div>
      <div>
        <Button onPress={() => setOpen(true)}>Show me</Button>
      </div>
      <Tour
        isOpen={open}
        onOpenChange={setOpen}
        mask={false}
        placement="end"
        steps={[{ target: toggle, title: "Try it now", description: "Turn the summary on; the tip stays open while you do." }]}
      />
    </Stack>
  );
}
