import { List } from "@senvenli/react/collection";
import { Icon, Lozenge } from "@senvenli/react/display";

type Delivery = { id: string; customer: string; detail: string; isDelivered?: boolean };

const DELIVERIES: { title: string; items: Delivery[] }[] = [
  {
    title: "Today",
    items: [
      { id: "1042", customer: "Ada Lovelace", detail: "Order SO-1042 · 9:00 AM · Boston", isDelivered: true },
      { id: "1043", customer: "Grace Hopper", detail: "Order SO-1043 · 11:30 AM · Cambridge" },
      { id: "1044", customer: "Alan Turing", detail: "Order SO-1044 · 2:00 PM · Somerville" },
    ],
  },
  {
    title: "Tomorrow",
    items: [
      { id: "1045", customer: "Katherine Johnson", detail: "Order SO-1045 · 10:00 AM · Boston" },
      { id: "1046", customer: "Margaret Hamilton", detail: "Order SO-1046 · 3:30 PM · Quincy" },
    ],
  },
];

export default function Example() {
  return (
    <List
      aria-label="Deliveries"
      sections={DELIVERIES}
      renderItem={(delivery) => ({
        id: delivery.id,
        leading: <Icon name="package" color="subtle" />,
        title: delivery.customer,
        description: delivery.detail,
        trailing: delivery.isDelivered ? <Lozenge tone="success">Delivered</Lozenge> : <Lozenge tone="information">Scheduled</Lozenge>,
      })}
    />
  );
}
