import { Button } from "@senvenli/react/action";
import { PanelHeader } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <PanelHeader
      breadcrumbs={[{ label: "Orders", href: "#" }, { label: "ORD-1040" }]}
      title="Order ORD-1040"
      description="Ada Lovelace · placed March 18"
      actions={
        <>
          <Button>Refund</Button>
          <Button variant="primary">Mark as shipped</Button>
        </>
      }
    />
  );
}
