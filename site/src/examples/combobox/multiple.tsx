import { ComboBox } from "@senvenli/react/selection";

const MEMBERS = [
  { id: "ada", label: "Ada Lovelace", description: "Engineering" },
  { id: "alan", label: "Alan Turing", description: "Engineering" },
  { id: "grace", label: "Grace Hopper", description: "Operations" },
  { id: "katherine", label: "Katherine Johnson", description: "Finance" },
  { id: "margaret", label: "Margaret Hamilton", description: "Product", isDisabled: true },
];

export default function Example() {
  return (
    <div className="max-w-96">
      <ComboBox
        label="Reviewers"
        description="Margaret is on leave this week."
        selectionMode="multiple"
        menuTrigger="focus"
        items={MEMBERS}
        defaultSelectedKeys={["ada", "grace"]}
      />
    </div>
  );
}
