import { Button } from "@senvenli/react/action";
import { DescriptionList } from "@senvenli/react/display";

export default function Example() {
  return (
    <DescriptionList
      items={[
        { label: "Order ID", value: "ORD-1042", copyValue: "ORD-1042" },
        { label: "Tracking number", value: "1Z 999 AA1 01 2345 6784", copyValue: "1Z999AA10123456784" },
        {
          label: "Shipping address",
          value: "12 St James's Square, London",
          action: (
            <Button variant="link" size="small">
              Edit
            </Button>
          ),
        },
      ]}
    />
  );
}
