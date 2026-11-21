import { Breadcrumbs } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Breadcrumbs
      aria-label="Location"
      items={[
        { label: "Customers", href: "#" },
        { label: "Analytical Engines Ltd", href: "#" },
        { label: "Orders", href: "#" },
        { label: "ORD-1040", href: "#" },
        { label: "Invoices", href: "#" },
        { label: "INV-2041" },
      ]}
    />
  );
}
