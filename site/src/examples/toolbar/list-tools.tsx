import { Button } from "@senvenli/react/action";
import { Input } from "@senvenli/react/form";
import { Toolbar, ToolbarSpacer } from "@senvenli/react/layout";
import { Select } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Toolbar aria-label="Order tools">
      <Input type="search" aria-label="Search orders" placeholder="Order number or customer" size="small" />
      <Select
        aria-label="Status"
        size="small"
        placeholder="All statuses"
        items={[
          { id: "open", label: "Open" },
          { id: "paid", label: "Paid" },
          { id: "overdue", label: "Overdue" },
        ]}
      />
      <ToolbarSpacer />
      <Button size="small" iconBefore="download">
        Export
      </Button>
    </Toolbar>
  );
}
