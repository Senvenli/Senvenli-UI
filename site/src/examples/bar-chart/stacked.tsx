import { BarChart } from "@senvenli/react/charts";

const ORDERS = [
  { month: "Jan", web: 420, app: 260, phone: 90 },
  { month: "Feb", web: 455, app: 300, phone: 84 },
  { month: "Mar", web: 510, app: 365, phone: 78 },
  { month: "Apr", web: 480, app: 410, phone: 70 },
  { month: "May", web: 540, app: 470, phone: 66 },
  { month: "Jun", web: 590, app: 520, phone: 61 },
];

export default function Example() {
  return (
    <BarChart
      type="stacked"
      title="Orders by channel"
      period="Jan–Jun 2026"
      data={ORDERS}
      index="month"
      categories={["web", "app", "phone"]}
      labels={{ web: "Website", app: "Mobile app", phone: "Phone" }}
      allowDecimals={false}
    />
  );
}
