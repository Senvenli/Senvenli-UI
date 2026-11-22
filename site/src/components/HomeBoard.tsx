import { CalendarDate } from "@internationalized/date";
import { Button } from "@senvenli/react/action";
import { AreaChart } from "@senvenli/react/charts";
import { Calendar } from "@senvenli/react/date";
import { Badge, Stat, StatGroup } from "@senvenli/react/display";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Checkbox, Switch } from "@senvenli/react/selection";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE = MONTHS.map((month, i) => ({ month, online: 32000 + i * 2400 + (i % 3) * 1800, retail: 18000 + i * 900 }));
const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

/** A cell of the board: flat, on the raised surface, no border. */
function Cell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "rounded-ds-large bg-ds-surface-raised p-ds-300 md:col-span-2" : "rounded-ds-large bg-ds-surface-raised p-ds-300"}>{children}</div>;
}

/** Real components, deterministic data: what a theme changes, at a glance. */
export function HomeBoard() {
  return (
    <div data-slot="home-board" className="grid items-start gap-ds-200 md:grid-cols-3">
      <Cell>
        <Stack space="space-200">
          <Input label="Workspace name" defaultValue="Acme" />
          <Input label="Billing email" type="email" defaultValue="ada@example.com" />
          <Checkbox defaultSelected>Send me the monthly report</Checkbox>
          <div className="flex flex-wrap gap-ds-100">
            <Button variant="primary">Save changes</Button>
            <Button>Cancel</Button>
          </div>
        </Stack>
      </Cell>
      <Cell wide>
        <AreaChart
          title="Revenue"
          period="Jan–Dec 2026"
          data={REVENUE}
          index="month"
          categories={["online", "retail"]}
          labels={{ online: "Online", retail: "Retail" }}
          valueFormatter={(value) => money.format(value)}
        />
      </Cell>
      <Cell>
        <Calendar aria-label="Delivery day" defaultValue={new CalendarDate(2026, 3, 18)} />
      </Cell>
      <Cell>
        <StatGroup aria-label="This month">
          <Stat label="Orders" value="1,204" delta={{ value: "12%", direction: "up", isPositive: true }} comparison="vs. February" />
          <Stat label="Refunds" value="18" delta={{ value: "3%", direction: "down", isPositive: true }} comparison="vs. February" />
        </StatGroup>
      </Cell>
      <Cell>
        <Stack space="space-200">
          <div className="flex flex-wrap gap-ds-100">
            <Badge tone="success">Paid</Badge>
            <Badge tone="warning">Pending</Badge>
            <Badge tone="information">Shipped</Badge>
            <Badge tone="danger">Failed</Badge>
          </div>
          <Switch defaultSelected description="Ask for a code on every sign-in.">
            Two-step sign-in
          </Switch>
          <Switch description="A weekly summary of open orders.">Weekly digest</Switch>
        </Stack>
      </Cell>
    </div>
  );
}
