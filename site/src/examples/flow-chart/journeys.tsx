import { FlowChart } from "@senvenli/react/charts";

const count = new Intl.NumberFormat("en");

export default function Example() {
  return (
    <div className="w-[44rem] max-w-full">
      <FlowChart
        title="Visitor journeys"
        period="Last 30 days"
        valueFormatter={(value) => count.format(value)}
        nodes={[
          { id: "home", label: "Home" },
          { id: "blog", label: "Blog" },
          { id: "pricing", label: "Pricing" },
          { id: "docs", label: "Docs" },
          { id: "signup", label: "Signup" },
          { id: "left", label: "Left" },
        ]}
        links={[
          { source: "home", target: "pricing", value: 3200 },
          { source: "home", target: "docs", value: 1800 },
          { source: "blog", target: "pricing", value: 900 },
          { source: "blog", target: "docs", value: 600 },
          { source: "pricing", target: "signup", value: 1400 },
          { source: "pricing", target: "left", value: 2700 },
          { source: "docs", target: "signup", value: 500 },
          { source: "docs", target: "left", value: 1900 },
        ]}
      />
    </div>
  );
}
