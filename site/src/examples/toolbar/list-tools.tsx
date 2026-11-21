import { Button } from "@senvenli/react/action";
import { SearchField } from "@senvenli/react/form";
import { Toolbar, ToolbarSpacer } from "@senvenli/react/navigation";
import { Select } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Toolbar aria-label="Order tools">
      <SearchField aria-label="Search orders" placeholder="Order number or customer" size="compact" />
      <Select
        aria-label="Status"
        size="compact"
        placeholder="All statuses"
        items={[
          { id: "open", label: "Open" },
          { id: "paid", label: "Paid" },
          { id: "overdue", label: "Overdue" },
        ]}
      />
      <ToolbarSpacer />
      <Button size="compact" iconBefore="download">
        Export
      </Button>
    </Toolbar>
  );
}
