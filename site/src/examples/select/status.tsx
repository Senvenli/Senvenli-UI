import { Select } from "@senvenli/react/selection";

export default function Example() {
  return (
    <div className="max-w-80">
      <Select
        label="Status"
        placeholder="Choose a status"
        defaultSelectedKey="in-progress"
        items={[
          { id: "draft", label: "Draft" },
          { id: "in-progress", label: "In progress" },
          { id: "in-review", label: "In review" },
          { id: "done", label: "Done" },
        ]}
      />
    </div>
  );
}
