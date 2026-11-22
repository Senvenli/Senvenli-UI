import { Select } from "@senvenli/react/selection";

const REGIONS = [
  { id: "na", label: "North America" },
  { id: "sa", label: "South America" },
  { id: "eu", label: "Europe" },
  { id: "me", label: "Middle East" },
  { id: "af", label: "Africa" },
  { id: "apac", label: "Asia Pacific" },
];

export default function Example() {
  return (
    <div className="max-w-80">
      <Select selectionMode="multiple"
        label="Regions"
        description="Orders from these regions appear in the report."
        allowsSelectAll
        maxVisibleTags={2}
        defaultSelectedKeys={["na", "eu", "apac", "me"]}
        items={REGIONS}
      />
    </div>
  );
}
