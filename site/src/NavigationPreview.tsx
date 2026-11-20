import { Card, CardBody, CardHeader, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { Accordion, Breadcrumbs, Pagination, SegmentedControl, Stepper, Tabs } from "@senvenli/react/navigation";
import { useState } from "react";

/** The navigation family: tabs, breadcrumbs, pagination, accordion and stepper. */
export function NavigationPreview() {
  const [page, setPage] = useState(3);
  return (
    <>
      <Card>
        <CardHeader title="Tabs and breadcrumbs" subtitle="Tabs, SegmentedControl, Breadcrumbs" />
        <CardBody>
          <Stack space="space-300">
            <Breadcrumbs
              items={[
                { label: "Projects", href: "#" },
                { label: "Atlas", href: "#" },
                { label: "Settings" },
              ]}
            />
            <Tabs
              aria-label="Project"
              items={[
                { id: "overview", label: "Overview", panel: <Text>Everything about the project at a glance.</Text> },
                { id: "activity", label: "Activity", count: 12, panel: <Text>Recent changes by your team.</Text> },
                { id: "settings", label: "Settings", panel: <Text>Name, members and billing.</Text> },
              ]}
            />
            <SegmentedControl
              label="Period"
              defaultValue="week"
              items={[
                { id: "day", label: "Day" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
              ]}
            />
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Steps and pages" subtitle="Stepper, Pagination, Accordion" />
        <CardBody>
          <Stack space="space-300">
            <Stepper
              currentStep="domain"
              completedSteps={["account", "workspace"]}
              steps={[
                { id: "account", label: "Account" },
                { id: "workspace", label: "Workspace" },
                { id: "domain", label: "Domain" },
                { id: "live", label: "Live" },
              ]}
            />
            <Pagination page={page} pageSize={20} total={1204} onPageChange={setPage} />
            <Accordion
              items={[
                { id: "plans", title: "Can I change plans later?", content: "Yes, upgrade or downgrade at any time." },
                { id: "trial", title: "Is there a free trial?", content: "Every plan starts with 14 days free." },
              ]}
            />
          </Stack>
        </CardBody>
      </Card>
    </>
  );
}
