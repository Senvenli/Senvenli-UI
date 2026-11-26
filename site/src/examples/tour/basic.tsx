import * as React from "react";
import { Button } from "@senvenli/react/action";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Tour } from "@senvenli/react/overlay";

export default function Example() {
  const [open, setOpen] = React.useState(false);
  const search = React.useRef<HTMLDivElement>(null);
  const create = React.useRef<HTMLDivElement>(null);
  return (
    <Stack space="space-300">
      <Stack direction="horizontal" space="space-150" align="end" wrap>
        <div ref={search} className="min-w-0 flex-1">
          <Input label="Search orders" placeholder="Name or number" />
        </div>
        <div ref={create}>
          <Button variant="primary" iconBefore="plus">New order</Button>
        </div>
      </Stack>
      <div>
        <Button onPress={() => setOpen(true)}>Start the tour</Button>
      </div>
      <Tour
        isOpen={open}
        onOpenChange={setOpen}
        steps={[
          { target: search, title: "Find any order", description: "Search by the customer's name or the order number." },
          { target: create, title: "Take a new order", description: "Opens the order form with today's date filled in." },
          { title: "You're set", description: "Start this tour again from Help whenever you like." },
        ]}
      />
    </Stack>
  );
}
