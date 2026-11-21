import { TagGroup } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [days, setDays] = useState<(string | number)[]>(["mon", "wed"]);
  return (
    <TagGroup
      label="Delivery days"
      description={`${days.length} of 5 days selected.`}
      selectionMode="multiple"
      selectedKeys={days}
      onSelectionChange={setDays}
      items={[
        { id: "mon", label: "Monday" },
        { id: "tue", label: "Tuesday" },
        { id: "wed", label: "Wednesday" },
        { id: "thu", label: "Thursday" },
        { id: "fri", label: "Friday" },
      ]}
    />
  );
}
