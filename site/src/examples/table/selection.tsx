import { useState } from "react";
import { Table, type TableProps } from "@senvenli/react/collection";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

type Product = { id: string; name: string; stock: number; price: number };
const PRODUCTS: Product[] = [
  { id: "chair", name: "Ergonomic chair", stock: 42, price: 349 },
  { id: "desk", name: "Standing desk, oak", stock: 17, price: 589 },
  { id: "arm", name: "Monitor arm, dual", stock: 63, price: 129 },
  { id: "lamp", name: "Desk lamp", stock: 0, price: 79 },
  { id: "tray", name: "Cable tray", stock: 118, price: 38 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// "all" once the header checkbox is pressed, a set of row ids otherwise.
type Keys = NonNullable<TableProps<Product>["selectedKeys"]>;

export default function Example() {
  const [selected, setSelected] = useState<Keys>(new Set(["desk", "arm"]));
  const count = selected === "all" ? PRODUCTS.length : [...selected].length;
  return (
    <Stack space="space-150">
      <Table
        aria-label="Products"
        rows={PRODUCTS}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={setSelected}
        columns={[
          { key: "name", header: "Product" },
          { key: "stock", header: "In stock", align: "end" },
          { key: "price", header: "Price", align: "end", render: (product) => usd.format(product.price) },
        ]}
      />
      <Text size="body-small" tone="subtle">{count} of {PRODUCTS.length} products selected</Text>
    </Stack>
  );
}
