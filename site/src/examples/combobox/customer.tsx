import { ComboBox } from "@senvenli/react/selection";

const CUSTOMERS = [
  { id: "ada", label: "Ada Lovelace", description: "ada@example.com" },
  { id: "alan", label: "Alan Turing", description: "alan@example.com" },
  { id: "grace", label: "Grace Hopper", description: "grace@example.com" },
  { id: "katherine", label: "Katherine Johnson", description: "katherine@example.com" },
  { id: "linus", label: "Linus Torvalds", description: "linus@example.com" },
  { id: "margaret", label: "Margaret Hamilton", description: "margaret@example.com" },
];

export default function Example() {
  return (
    <div className="max-w-80">
      <ComboBox label="Customer" placeholder="Name or email" items={CUSTOMERS} defaultSelectedKey="ada" />
    </div>
  );
}
