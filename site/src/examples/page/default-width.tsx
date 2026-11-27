import { Stat, StatGroup } from "@senvenli/react/display";
import { Page, PageSection } from "@senvenli/react/layout";
import { PageHeader } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Page>
      <PageHeader title="Overview" description="March 2026" />
      <PageSection title="This month">
        <StatGroup aria-label="This month">
          <Stat label="Revenue" value="$48,920" delta={{ value: "12.4%", direction: "up" }} comparison="vs. February" />
          <Stat label="New customers" value="312" delta={{ value: "4.0%", direction: "up" }} comparison="vs. February" />
          <Stat label="Refunds" value="18" delta={{ value: "25%", direction: "down", isPositive: true }} comparison="vs. February" />
        </StatGroup>
      </PageSection>
    </Page>
  );
}
