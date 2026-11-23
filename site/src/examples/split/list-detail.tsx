import { GridList, type GridListStackProps } from "@senvenli/react/collection";
import { Heading, Text } from "@senvenli/react/display";
import { Split, SplitPane, Stack } from "@senvenli/react/layout";
import { useState } from "react";

const INVOICES = [
  { id: "inv-318", customer: "Northwind", total: "€1,240.00", due: "Due March 25" },
  { id: "inv-317", customer: "Globex", total: "€860.50", due: "Due March 27" },
  { id: "inv-316", customer: "Initech", total: "€2,015.00", due: "Due April 2" },
];

type Keys = NonNullable<GridListStackProps["selectedKeys"]>;

export default function Example() {
  const [selected, setSelected] = useState<Keys>(new Set(["inv-318"]));
  const id = selected === "all" ? INVOICES[0]!.id : ([...selected][0] ?? INVOICES[0]!.id);
  const invoice = INVOICES.find((item) => item.id === id)!;
  return (
    <Split ratio="16rem 1fr" space="space-300">
      <SplitPane>
        <GridList
          aria-label="Invoices"
          items={INVOICES}
          selectionMode="single"
          selectedKeys={selected}
          onSelectionChange={setSelected}
          renderItem={(item) => ({ id: item.id, title: item.customer, description: item.total })}
        />
      </SplitPane>
      <SplitPane background="surface-sunken" radius="large" padding="space-300">
        <Stack space="space-100">
          <Heading level={3} size="heading-small">{invoice.customer}</Heading>
          <Text size="body-large" weight="medium">{invoice.total}</Text>
          <Text tone="subtle">{invoice.due}</Text>
        </Stack>
      </SplitPane>
    </Split>
  );
}
