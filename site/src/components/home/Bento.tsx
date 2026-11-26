import { CalendarDate } from "@internationalized/date";
import { Button } from "@senvenli/react/action";
import { AreaChart, BarList } from "@senvenli/react/charts";
import { Calendar } from "@senvenli/react/date";
import { Badge, Stat, StatGroup } from "@senvenli/react/display";
import { ProgressBar } from "@senvenli/react/feedback";
import { Input } from "@senvenli/react/form";
import { Checkbox, Select, Slider, Switch } from "@senvenli/react/selection";
import { useRef } from "react";
import { useOwnHeights } from "../../lib/own-heights";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE = MONTHS.map((month, i) => ({ month, online: 32000 + i * 2400 + (i % 3) * 1800, retail: 18000 + i * 900 + (i % 2) * 1200 }));
const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const CHANNELS = [
  { name: "Online store", value: 642 },
  { name: "Marketplace", value: 318 },
  { name: "Retail", value: 244 },
];

/** A cell of the bento: flat on the raised surface, filling its row so no cell leaves a hole under it. */
function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex min-w-0 flex-col rounded-ds-xlarge bg-ds-surface-raised p-ds-200 sm:p-ds-300 ${className}`}>{children}</div>;
}

/**
 * Real components with fixed data: what a theme changes, at a glance. Laid out by the bento's own width: twelve columns
 * from 64rem (8 + 4, then three cells of 4), two from 40rem (the chart across, then two rows of two), one below; cells
 * stretch to their row, so the grid has no gaps. A chart that opens its data table grows alone: the cards beside it
 * keep their height (useOwnHeights).
 */
export function Bento() {
  const grid = useRef<HTMLDivElement>(null);
  useOwnHeights(grid);
  return (
    // Laid out by its own width, not the viewport's: on the landing it spans the page, in the builder it shares the
    // row with the controls. Twelve columns wait for 64rem: below it a third of the row is too narrow for a calendar
    // at its own size, and the cells beside it wrap and grow tall.
    <div className="@container">
    <div ref={grid} data-slot="home-bento" className="grid items-stretch gap-ds-200 @[40rem]:grid-cols-2 @5xl:grid-cols-12">
      <Cell className="@[40rem]:col-span-2 @5xl:col-span-8">
        <AreaChart
          title="Revenue"
          period="Jan–Dec 2026"
          data={REVENUE}
          index="month"
          categories={["online", "retail"]}
          labels={{ online: "Online", retail: "Retail" }}
          valueFormatter={(value) => money.format(value)}
          height={220}
        />
      </Cell>
      <Cell className="gap-ds-200 @5xl:col-span-4">
        <Input label="Workspace name" defaultValue="Acme" />
        <Input label="Billing email" type="email" defaultValue="ada@example.com" />
        <Select
          label="Plan"
          defaultSelectedKey="team"
          items={[
            { id: "starter", label: "Starter" },
            { id: "team", label: "Team" },
            { id: "business", label: "Business" },
          ]}
        />
        <Checkbox defaultSelected>Send me the monthly report</Checkbox>
        <div className="mt-auto flex flex-wrap gap-ds-100 pt-ds-100">
          <Button variant="primary">Save changes</Button>
          <Button>Cancel</Button>
        </div>
      </Cell>
      <Cell className="home-calendar-cell @5xl:col-span-4">
        {/* The cell is the calendar's surface: the calendar gives up its own card and fills the cell (styles.css). */}
        <div className="home-calendar">
          <Calendar aria-label="Delivery day" defaultValue={new CalendarDate(2026, 3, 18)} />
        </div>
      </Cell>
      <div className="flex min-w-0 flex-col gap-ds-200 @5xl:col-span-4">
        <StatGroup aria-label="This month">
          <Stat label="Orders" value="1,204" delta={{ value: "12%", direction: "up", isPositive: true }} comparison="vs. February" />
          <Stat label="Refunds" value="18" delta={{ value: "3%", direction: "down", isPositive: true }} comparison="vs. February" />
        </StatGroup>
        <Cell className="flex-1">
          <BarList aria-label="Orders by channel" data={CHANNELS} />
        </Cell>
      </div>
      <Cell className="gap-ds-300 @5xl:col-span-4">
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
        <Slider label="Monthly budget" defaultValue={60} />
        <ProgressBar label="Storage used" value={72} />
      </Cell>
    </div>
    </div>
  );
}
