import { Sparkline } from "@senvenli/react/charts";

const DAILY_ORDERS = [42, 51, 38, 64, 58, 71, 33, 47, 55, 62, 69, 74, 36, 49];

export default function Example() {
  return <Sparkline type="bar" data={DAILY_ORDERS} width={160} height={40} aria-label="Orders per day, last 14 days" />;
}
