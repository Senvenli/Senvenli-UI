import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { PageHeader, PageHeaderBar, PageHeaderProvider } from "@senvenli/react/navigation";
import { toast } from "@senvenli/react/overlay";

function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" actions={<Button variant="primary">Add customer</Button>} />
      <Text tone="subtle">The page's content scrolls under the bar. The menu button shows under 1024px and opens the Sidebar.</Text>
    </>
  );
}

export default function Example() {
  return (
    <PageHeaderProvider>
      <div className="flex h-56 flex-col overflow-hidden rounded-ds-large border border-ds-border">
        <PageHeaderBar menuLabel="Open menu" onMenuPress={() => toast("Menu opened")} />
        <div className="flex-1 overflow-y-auto p-ds-300">
          <CustomersPage />
        </div>
      </div>
    </PageHeaderProvider>
  );
}
