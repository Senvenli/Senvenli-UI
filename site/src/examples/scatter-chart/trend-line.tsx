import { ScatterChart } from "@senvenli/react/charts";

const CAMPAIGNS = [
  { campaign: "Spring sale", spend: 1200, revenue: 5400 },
  { campaign: "Newsletter", spend: 300, revenue: 2100 },
  { campaign: "Search ads", spend: 2600, revenue: 9800 },
  { campaign: "Social video", spend: 1800, revenue: 5900 },
  { campaign: "Partner webinar", spend: 900, revenue: 4700 },
  { campaign: "Retargeting", spend: 2100, revenue: 8900 },
  { campaign: "Podcast", spend: 3400, revenue: 10200 },
];
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact" });

export default function Example() {
  return (
    <ScatterChart
      title="Ad spend and revenue"
      period="Q1 2026 campaigns"
      data={CAMPAIGNS}
      name="campaign"
      x="spend"
      y="revenue"
      xLabel="Spend (USD)"
      yLabel="Revenue (USD)"
      valueFormatters={{ x: usd.format, y: usd.format }}
      trendLine
    />
  );
}
