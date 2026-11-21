import { DescriptionList } from "@senvenli/react/display";

export default function Example() {
  return (
    <DescriptionList
      layout="stacked"
      columns={3}
      items={[
        { label: "Invoice", value: "INV-2026-0318" },
        { label: "Issued", value: "March 18, 2026" },
        { label: "Due", value: "April 17, 2026" },
        { label: "Subtotal", value: "$1,120.00" },
        { label: "Tax", value: "$120.00" },
        { label: "Total", value: "$1,240.00" },
      ]}
    />
  );
}
