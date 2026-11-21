import { DescriptionList } from "@senvenli/react/display";
import { Accordion } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Accordion
      allowsMultipleExpanded
      headingLevel={4}
      defaultExpandedKeys={["customer", "payment"]}
      items={[
        {
          id: "customer",
          title: "Customer",
          content: <DescriptionList items={[{ label: "Name", value: "Ada Lovelace" }, { label: "Email", value: "ada@example.com" }]} />,
        },
        {
          id: "payment",
          title: "Payment",
          content: <DescriptionList items={[{ label: "Method", value: "Card ending 4242" }, { label: "Total", value: "$248.00" }]} />,
        },
        { id: "notes", title: "Notes", content: "Prefers delivery before noon." },
      ]}
    />
  );
}
