import { Button } from "@senvenli/react/action";
import { Table } from "@senvenli/react/collection";
import { Badge } from "@senvenli/react/display";
import { Page, PageSection } from "@senvenli/react/layout";
import { PageHeader } from "@senvenli/react/navigation";

const CUSTOMERS = [
  { id: "1", name: "Ada Lovelace", city: "London", plan: "Pro", orders: 42 },
  { id: "2", name: "Grace Hopper", city: "New York", plan: "Basic", orders: 18 },
  { id: "3", name: "Alan Turing", city: "Manchester", plan: "Pro", orders: 64 },
];

export default function Example() {
  return (
    <Page width="full">
      <PageHeader title="Customers" description="Everyone with an account." actions={<Button variant="primary">New customer</Button>} />
      <PageSection title="Active" description="Signed in during the last 30 days." actions={<Button size="small">Export</Button>}>
        <Table
          aria-label="Active customers"
          rows={CUSTOMERS}
          columns={[
            { key: "name", header: "Customer", isRowHeader: true },
            { key: "city", header: "City" },
            { key: "plan", header: "Plan", render: (row) => <Badge tone={row.plan === "Pro" ? "information" : "neutral"}>{row.plan}</Badge> },
            { key: "orders", header: "Orders", align: "end" },
          ]}
        />
      </PageSection>
    </Page>
  );
}
