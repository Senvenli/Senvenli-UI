import { Button } from "@senvenli/react/action";
import { Input } from "@senvenli/react/form";
import { PageHeader } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <PageHeader
      title="Orders"
      description="1,204 orders, 18 awaiting payment."
      actions={
        <>
          <Input type="search" aria-label="Search orders" placeholder="Order number or customer" size="small" />
          <Button variant="primary" iconBefore="plus">
            Create order
          </Button>
        </>
      }
    />
  );
}
