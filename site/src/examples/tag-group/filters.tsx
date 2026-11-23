import { TagGroup, type TagItem } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [filters, setFilters] = useState<TagItem[]>([
    { id: "status", label: "Status: Paid" },
    { id: "customer", label: "Customer: Ada Lovelace" },
    { id: "period", label: "Last 30 days" },
  ]);
  return (
    <TagGroup
      label="Active filters"
      items={filters}
      onRemove={(keys) => setFilters((current) => current.filter((filter) => !keys.includes(filter.id)))}
      emptyState="No filters. Showing every invoice."
    />
  );
}
