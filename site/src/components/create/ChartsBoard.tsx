import { AreaChart, BarChart, BarList, DonutChart, GaugeChart, Sparkline } from "@senvenli/react/charts";
import { Card, CardBody } from "@senvenli/react/display";

const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const formatMoney = (value: number) => money.format(value);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE = MONTHS.map((month, i) => ({
  month,
  online: Math.round(32000 + i * 2400 + Math.sin(i) * 5000),
  retail: Math.round(18000 + i * 900 + Math.cos(i) * 3000),
}));

const REGIONS = [
  { region: "North", orders: 420, returns: 38 },
  { region: "South", orders: 310, returns: 22 },
  { region: "East", orders: 265, returns: 30 },
  { region: "West", orders: 198, returns: 12 },
];

/**
 * The charts family: area, bar, donut, bar list, gauge and sparkline. Two columns that are each their own stack (from
 * 40rem of the preview's width), not rows of a grid: a chart that opens its data table pushes down only the cards
 * under it, and no card is stretched to the height of the one beside it.
 */
export function ChartsBoard() {
  return (
    <div className="grid items-start gap-ds-200 @[40rem]:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-ds-200">
      <Card>
        <CardBody>
          <AreaChart
            title="Revenue"
            period="Jan–Dec 2026"
            total={formatMoney(REVENUE.reduce((sum, row) => sum + row.online + row.retail, 0))}
            data={REVENUE}
            index="month"
            categories={["online", "retail"]}
            labels={{ online: "Online", retail: "Retail" }}
            valueFormatter={formatMoney}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <DonutChart
            title="Sales channels"
            period="November"
            centerLabel="orders"
            data={[
              { name: "Online", value: 640 },
              { name: "Retail", value: 310 },
              { name: "Wholesale", value: 150 },
              { name: "Marketplace", value: 90 },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center gap-ds-200">
            <Sparkline aria-label="Visitors, rising over 12 days" data={[12, 14, 11, 16, 18, 17, 21, 24, 22, 27, 29, 31]} />
            <Sparkline type="bar" aria-label="Sign-ups per day" data={[3, 5, 2, 6, 4, 7, 5, 8]} />
          </div>
        </CardBody>
      </Card>
      </div>
      <div className="flex min-w-0 flex-col gap-ds-200">
      <Card>
        <CardBody>
          <BarChart title="Orders by region" period="This quarter" data={REGIONS} index="region" categories={["orders", "returns"]} labels={{ orders: "Orders", returns: "Returns" }} allowDecimals={false} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <BarList
            title="Top products"
            period="November"
            data={[
              { name: "Desk lamp", value: 1240 },
              { name: "Office chair", value: 980 },
              { name: "Standing desk", value: 760 },
              { name: "Monitor arm", value: 430 },
              { name: "Cable tray", value: 210 },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {/* The gauge is as wide as twice its height (less 32px) and does not shrink: 132px keeps it inside a 320px phone's card. */}
          <GaugeChart title="Quota" period="Q4" value={72} max={100} target={80} valueFormatter={(v) => `${v}%`} height={132} />
        </CardBody>
      </Card>
      </div>
    </div>
  );
}
