import { Button } from "@senvenli/react/action";
import { SearchField } from "@senvenli/react/form";
import { PanelHeader } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <PanelHeader
      title="Orders"
      description="1,204 orders, 18 awaiting payment."
      actions={
        <>
          <SearchField aria-label="Search orders" placeholder="Order number or customer" size="compact" />
          <Button variant="primary" iconBefore="plus">
            Create order
          </Button>
        </>
      }
    />
  );
}
