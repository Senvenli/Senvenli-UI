import { useEffect, useState } from "react";
import { Button } from "@senvenli/react/action";
import { Table } from "@senvenli/react/collection";
import { Stack } from "@senvenli/react/layout";

type Customer = { id: string; name: string; city: string; orders: number };
const CUSTOMERS: Customer[] = [
  { id: "1", name: "Ada Lovelace", city: "Boston", orders: 42 },
  { id: "2", name: "Grace Hopper", city: "Chicago", orders: 18 },
  { id: "3", name: "Alan Turing", city: "Denver", orders: 64 },
  { id: "4", name: "Katherine Johnson", city: "Portland", orders: 27 },
];

export default function Example() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [isLoading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    setTimeout(() => {
      setRows(CUSTOMERS);
      setLoading(false);
    }, 3000);
  };
  useEffect(load, []);
  return (
    <div className="w-[36rem] max-w-full">
    <Stack space="space-200">
      <div>
        <Button size="small" iconBefore="rotate-cw" isDisabled={isLoading} onPress={load}>
          Reload
        </Button>
      </div>
      {/* No rows yet: skeleton lines under the header. Rows showing: they stay, dimmed under a bar, until the new ones arrive. */}
      <Table
        aria-label="Customers"
        isLoading={isLoading}
        rows={rows}
        columns={[
          { key: "name", header: "Customer", isRowHeader: true },
          { key: "city", header: "City" },
          { key: "orders", header: "Orders", align: "end" },
        ]}
      />
    </Stack>
    </div>
  );
}
