import { Button } from "@senvenli/react/action";
import { Menu } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Menu
      aria-label="Row density"
      placement="bottom start"
      trigger={<Button iconBefore="rows-3">Density</Button>}
      selectionMode="single"
      defaultSelectedKeys={["comfortable"]}
      items={[
        { id: "compact", label: "Compact" },
        { id: "comfortable", label: "Comfortable" },
        { id: "spacious", label: "Spacious" },
      ]}
    />
  );
}
