import { DataTable, type DataTableQuery, type DataTableResult } from "@senvenli/react/collection";

type Customer = { id: string; name: string; city: string; orders: number };

const NAMES = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Margaret Hamilton", "Barbara Liskov", "Donald Knuth", "Edsger Dijkstra"];
const CITIES = ["Boston", "Chicago", "Denver", "Portland", "Austin"];
const CUSTOMERS: Customer[] = Array.from({ length: 23 }, (_, index) => ({
  id: `C-${200 + index}`,
  name: NAMES[index % NAMES.length]!,
  city: CITIES[index % CITIES.length]!,
  orders: 3 + ((index * 11) % 17),
}));

// Stands in for your API: it gets the page, the page size, the search, the sort and the filters.
async function fetchCustomers({ page, pageSize, search }: DataTableQuery): Promise<DataTableResult<Customer>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const found = CUSTOMERS.filter((customer) => customer.name.toLowerCase().includes(search.trim().toLowerCase()));
  return { rows: found.slice((page - 1) * pageSize, page * pageSize), total: found.length };
}

export default function Example() {
  return (
    <DataTable
      aria-label="Customers"
      query={fetchCustomers}
      pageSize={5}
      urlKey="customers"
      columns={[
        { key: "name", header: "Customer" },
        { key: "city", header: "City" },
        { key: "orders", header: "Orders", align: "end" },
      ]}
      emptyState={{ title: "No customers yet", description: "Customers appear here after their first order." }}
    />
  );
}
