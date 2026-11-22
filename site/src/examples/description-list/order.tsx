import { DescriptionList, Badge } from "@senvenli/react/display";

export default function Example() {
  return (
    <DescriptionList
      items={[
        { label: "Customer", value: "Ada Lovelace" },
        { label: "Status", value: <Badge tone="success">Paid</Badge> },
        { label: "Total", value: "$1,240.00" },
        { label: "Placed", value: "March 18, 2026" },
        { label: "Delivery note", value: "" },
      ]}
    />
  );
}
