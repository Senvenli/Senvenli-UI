import { useState } from "react";
import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Toolbar, ToolbarSpacer } from "@senvenli/react/layout";
import { Menu } from "@senvenli/react/overlay";
import { ComboBox, Select, TagGroup, type ComboBoxLoader } from "@senvenli/react/selection";

// A filter bar composed from Toolbar, Menu, Select, ComboBox and TagGroup. The value is
// `[{ field, op, value }]`, kept in the URL as repeated `f=<field>:<op>:<value>`.
type Op = "eq" | "neq";
type Filter = { field: string; op: Op; value: string; label: string };
type Field = { key: string; label: string; loadOptions: (query: string) => Promise<{ id: string; label: string }[]> };

// Stands in for your API: options are ids with labels (country "DE" reads "Germany").
const options = (list: [string, string][]) => async (query: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return list.filter(([, label]) => label.toLowerCase().includes(query.toLowerCase())).map(([id, label]) => ({ id, label }));
};
const FIELDS: Field[] = [
  { key: "country", label: "Country", loadOptions: options([["DE", "Germany"], ["FR", "France"], ["IT", "Italy"], ["ES", "Spain"], ["NL", "Netherlands"]]) },
  { key: "browser", label: "Browser", loadOptions: options([["chrome", "Chrome"], ["safari", "Safari"], ["firefox", "Firefox"], ["edge", "Edge"]]) },
  { key: "path", label: "Page", loadOptions: options([["/", "/"], ["/pricing", "/pricing"], ["/blog", "/blog"], ["/signup", "/signup"]]) },
];
const OPS = [{ id: "eq", label: "is" }, { id: "neq", label: "is not" }];
const fieldOf = (key: string) => FIELDS.find((field) => field.key === key)!;

export default function Example() {
  const [filters, setFilters] = useState<Filter[]>([{ field: "country", op: "eq", value: "DE", label: "Germany" }]);
  const [adding, setAdding] = useState<string | null>(null);
  const [op, setOp] = useState<Op>("eq");
  const key = (filter: Filter) => `${filter.field}:${filter.op}:${filter.value}`;
  const field = adding ? fieldOf(adding) : null;
  // The field's loader as the ComboBox's server search (one page).
  const load: ComboBoxLoader | undefined = field ? async (text) => ({ items: await field.loadOptions(text) }) : undefined;

  return (
    <div className="flex w-[40rem] max-w-full flex-col gap-ds-150">
      <Toolbar aria-label="Filters">
        {field ? (
          <>
            <Select aria-label={`${field.label}: condition`} size="small" items={OPS} selectedKey={op} onSelectionChange={(next) => setOp(next as Op)} />
            <ComboBox
              key={field.key}
              aria-label={field.label}
              size="small"
              placeholder={`Search ${field.label.toLowerCase()}`}
              menuTrigger="focus"
              loadItems={load}
              onSelectionChange={(id) => {
                if (id == null) return;
                field.loadOptions("").then((all) => {
                  const chosen = all.find((option) => option.id === id);
                  const next = { field: field.key, op, value: String(id), label: chosen?.label ?? String(id) };
                  setFilters((current) => (current.some((item) => key(item) === key(next)) ? current : [...current, next]));
                  setAdding(null);
                  setOp("eq");
                });
              }}
            />
            <Button size="small" variant="subtle" onPress={() => setAdding(null)}>Cancel</Button>
          </>
        ) : (
          <Menu
            trigger={<Button size="small" iconBefore="list-filter">Add filter</Button>}
            placement="bottom start"
            items={FIELDS.map((item) => ({ id: item.key, label: item.label }))}
            onAction={(id) => setAdding(String(id))}
          />
        )}
        <ToolbarSpacer />
        {filters.length > 0 && <Button size="small" variant="subtle" onPress={() => setFilters([])}>Clear filters</Button>}
      </Toolbar>
      {/* Chips show labels, never raw values: "Country is Germany", not "country:eq:DE". */}
      <TagGroup
        label="Active filters"
        items={filters.map((filter) => ({ id: key(filter), label: `${fieldOf(filter.field).label} ${filter.op === "eq" ? "is" : "is not"} ${filter.label}` }))}
        onRemove={(keys) => setFilters((current) => current.filter((filter) => !keys.includes(key(filter))))}
        emptyState="No filters"
      />
      <Text size="body-small" tone="subtle">
        URL: {filters.length ? filters.map((filter) => `f=${key(filter)}`).join("&") : "(none)"}
      </Text>
    </div>
  );
}
