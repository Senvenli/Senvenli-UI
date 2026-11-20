import { DataTable, GridList, List, ListItem, ListSection, Table, TableCellStack } from "@senvenli/react/collection";
import { Card, CardBody, CardHeader, Lozenge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

type Order = { id: string; customer: string; email: string; status: "paid" | "pending" | "refunded"; total: number; placed: string };

const STATUS = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "neutral" },
} as const;

const CUSTOMERS = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Linus Pauling", "Hedy Lamarr", "Tim Berners-Lee"];
const ORDERS: Order[] = Array.from({ length: 48 }, (_, i) => {
  const customer = CUSTOMERS[i % CUSTOMERS.length]!;
  return {
    id: `#${1040 + i}`,
    customer,
    email: `${customer.split(" ")[0]!.toLowerCase()}@example.com`,
    status: (["paid", "pending", "paid", "refunded"] as const)[i % 4]!,
    total: 40 + ((i * 37) % 260) + 0.5,
    placed: `2026-11-${String((i % 20) + 1).padStart(2, "0")}`,
  };
});

const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });

const COLUMNS = [
  { key: "id", header: "Order", isRowHeader: true, isSortable: true, value: (o: Order) => o.id },
  {
    key: "customer",
    header: "Customer",
    isSortable: true,
    value: (o: Order) => o.customer,
    render: (o: Order) => <TableCellStack primary={o.customer} secondary={o.email} />,
  },
  {
    key: "status",
    header: "Status",
    isHideable: true,
    value: (o: Order) => o.status,
    render: (o: Order) => <Lozenge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Lozenge>,
  },
  { key: "placed", header: "Placed", isSortable: true, isHideable: true, hideBelow: "md" as const, value: (o: Order) => o.placed },
  { key: "total", header: "Total", align: "end" as const, isSortable: true, value: (o: Order) => o.total, render: (o: Order) => money.format(o.total) },
];

const PHOTOS = [
  { id: "front", title: "Front view", meta: "1.2 MB" },
  { id: "side", title: "Side view", meta: "980 KB" },
  { id: "detail", title: "Detail", meta: "2.4 MB" },
  { id: "packaging", title: "Packaging", meta: "1.6 MB" },
];

/** The collection family: a table, a data table with its tools, a grid list and a list. */
export function CollectionPreview() {
  return (
    <>
      <Card>
        <CardHeader title="Data table" subtitle="DataTable: search, a status filter, columns, bulk actions, paging" />
        <CardBody>
          <DataTable
            aria-label="Orders"
            columns={COLUMNS}
            rows={ORDERS}
            rowKey={(o) => o.id}
            pageSize={8}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { id: "paid", label: "Paid" },
                  { id: "pending", label: "Pending" },
                  { id: "refunded", label: "Refunded" },
                ],
              },
            ]}
            bulkActions={[{ id: "export", label: "Export", onAction: () => undefined }]}
            urlKey="orders"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Table" subtitle="Table with selection, default density" />
        <CardBody>
          <Table aria-label="Recent orders" columns={COLUMNS.slice(0, 4)} rows={ORDERS.slice(0, 4)} rowKey={(o) => o.id} selectionMode="multiple" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Grid list and list" subtitle="GridList, List with sections" />
        <CardBody>
          <Stack space="space-300">
            <GridList
              aria-label="Product photos"
              items={PHOTOS}
              selectionMode="multiple"
              renderItem={(photo) => ({
                title: photo.title,
                meta: photo.meta,
                media: <span className="text-body-small">{photo.title}</span>,
                actions: [{ id: "remove", icon: "trash-2", tone: "danger", label: `Remove photo: ${photo.title}`, onPress: () => undefined }],
              })}
            />
            <List aria-label="Deliveries">
              <ListSection title="Today">
                <ListItem id="1042" title="Order #1042" description="10:00 · Berlin" trailing={<Lozenge tone="success">Paid</Lozenge>} />
                <ListItem id="1043" title="Order #1043" description="14:30 · Lisbon" trailing={<Lozenge tone="warning">Pending</Lozenge>} />
              </ListSection>
              <ListSection title="Tomorrow">
                <ListItem id="1044" title="Order #1044" description="09:15 · Oslo" />
              </ListSection>
            </List>
          </Stack>
        </CardBody>
      </Card>
    </>
  );
}
