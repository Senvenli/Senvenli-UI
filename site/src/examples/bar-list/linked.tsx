import { BarList } from "@senvenli/react/charts";

const PAGES = [
  { name: "/pricing", value: 18420, href: "#pricing" },
  { name: "/features", value: 12960, href: "#features" },
  { name: "/blog/launch-notes", value: 9310, href: "#launch-notes" },
  { name: "/docs/getting-started", value: 7745, href: "#getting-started" },
  { name: "/customers", value: 4120, href: "#customers" },
];
const count = new Intl.NumberFormat("en");

export default function Example() {
  return <BarList title="Most visited pages" period="Last 30 days" data={PAGES} limit={3} valueFormatter={count.format} />;
}
