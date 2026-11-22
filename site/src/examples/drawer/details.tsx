import { Button } from "@senvenli/react/action";
import { DescriptionList } from "@senvenli/react/display";
import { DialogTrigger, Drawer } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <DialogTrigger>
      <Button>View order</Button>
      <Drawer title="Order ORD-1040" description="Ada Lovelace · placed March 18">
        <DescriptionList
          items={[
            { label: "Status", value: "Shipped" },
            { label: "Total", value: "$248.00" },
            { label: "Tracking", value: "1Z 999 AA1 01 2345 6784", copyValue: "1Z999AA10123456784" },
            { label: "Note" },
          ]}
        />
      </Drawer>
    </DialogTrigger>
  );
}
