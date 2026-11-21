import { Button } from "@senvenli/react/action";
import { EmptyState } from "@senvenli/react/feedback";

export default function Example() {
  return (
    <EmptyState
      icon="file-text"
      title="No invoices yet"
      description="Invoices you send to customers appear here with their status."
      primaryAction={<Button variant="primary" iconBefore="plus">Create invoice</Button>}
      secondaryAction={<Button variant="subtle">Import from CSV</Button>}
    />
  );
}
