import { Button } from "@senvenli/react/action";
import { Input } from "@senvenli/react/form";
import { Toolbar, ToolbarSpacer } from "@senvenli/react/layout";
import { Select } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Toolbar aria-label="Order tools">
      <Input type="search" aria-label="Search orders" placeholder="Search by order number or customer email" size="small" />
      <Select
        aria-label="Status"
        size="small"
        defaultSelectedKey="all"
        items={[
          { id: "all", label: "All" },
          { id: "open", label: "Open" },
          { id: "paid", label: "Paid" },
          { id: "refunded", label: "Partially refunded" },
        ]}
      />
      <ToolbarSpacer />
      <Button size="small" iconBefore="download">
        Export
      </Button>
    </Toolbar>
  );
}
