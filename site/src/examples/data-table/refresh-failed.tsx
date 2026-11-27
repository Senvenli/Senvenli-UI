import { useRef, useState } from "react";
import { DataTable, type DataTableQuery, type DataTableResult } from "@senvenli/react/collection";
import { Switch } from "@senvenli/react/selection";
import { Stack } from "@senvenli/react/layout";

type Customer = { id: string; name: string; orders: number };
const CUSTOMERS: Customer[] = Array.from({ length: 18 }, (_, index) => ({ id: `C-${300 + index}`, name: `Customer ${index + 1}`, orders: 2 + ((index * 7) % 13) }));

export default function Example() {
  const [offline, setOffline] = useState(false);
  const offlineRef = useRef(offline);
  offlineRef.current = offline;
  // Stands in for your API; with "Fail the next load" on, the next page, sort or search fails.
  const fetchCustomers = async ({ page, pageSize }: DataTableQuery): Promise<DataTableResult<Customer>> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (offlineRef.current) throw new Error("offline");
    return { rows: CUSTOMERS.slice((page - 1) * pageSize, page * pageSize), total: CUSTOMERS.length };
  };
  return (
    <div className="w-[36rem] max-w-full">
    <Stack space="space-200">
      <Switch isSelected={offline} onChange={setOffline}>Fail the next load</Switch>
      <DataTable
        aria-label="Customers"
        query={fetchCustomers}
        pageSize={6}
        columns={[
          { key: "name", header: "Customer", isRowHeader: true },
          { key: "orders", header: "Orders", align: "end" },
        ]}
      />
    </Stack>
    </div>
  );
}
