import { DescriptionList, Lozenge } from "@senvenli/react/display";

export default function Example() {
  return (
    <DescriptionList
      items={[
        { label: "Customer", value: "Ada Lovelace" },
        { label: "Status", value: <Lozenge tone="success">Paid</Lozenge> },
        { label: "Total", value: "$1,240.00" },
        { label: "Placed", value: "March 18, 2026" },
        { label: "Delivery note", value: "" },
      ]}
    />
  );
}
