import { useState } from "react";
import { GridList, type GridListStackProps } from "@senvenli/react/collection";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

const INVOICES = [
  { id: "inv-301", customer: "Ada Lovelace", detail: "$248.50 · due March 25" },
  { id: "inv-302", customer: "Grace Hopper", detail: "$96.00 · due March 27" },
  { id: "inv-303", customer: "Alan Turing", detail: "$1,290.00 · due April 2" },
];

type Keys = NonNullable<GridListStackProps["selectedKeys"]>;

export default function Example() {
  const [selected, setSelected] = useState<Keys>(new Set(["inv-301"]));
  const count = selected === "all" ? INVOICES.length : [...selected].length;
  return (
    <Stack space="space-150">
      <GridList
        aria-label="Unpaid invoices"
        items={INVOICES}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={setSelected}
        renderItem={(invoice) => ({ id: invoice.id, title: invoice.customer, description: invoice.detail })}
      />
      <Text size="body-small" tone="subtle">{count} selected for a reminder</Text>
    </Stack>
  );
}
