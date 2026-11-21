import { Select } from "@senvenli/react/selection";

export default function Example() {
  return (
    <div className="max-w-80">
      <Select
        label="Assign to"
        placeholder="Choose a team"
        description="The team is notified by email."
        items={[
          { id: "support-1", label: "Tier 1", description: "First response", meta: "8 people", group: "Support" },
          { id: "support-2", label: "Tier 2", description: "Escalations", meta: "3 people", group: "Support" },
          { id: "billing", label: "Billing", description: "Invoices and refunds", meta: "4 people", group: "Finance" },
          { id: "fraud", label: "Fraud review", description: "Paused until Monday", meta: "2 people", group: "Finance", isDisabled: true },
        ]}
      />
    </div>
  );
}
