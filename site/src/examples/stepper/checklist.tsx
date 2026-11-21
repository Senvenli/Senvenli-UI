import { Stepper } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Stepper
      aria-label="Workspace setup"
      orientation="vertical"
      currentStep="team"
      steps={[
        { id: "account", label: "Create your account", description: "Name, email and password." },
        { id: "workspace", label: "Name the workspace", description: "Shown on invoices and emails." },
        { id: "team", label: "Invite your team", description: "Add at least one other member." },
        { id: "billing", label: "Add a payment method", description: "Charged when the trial ends." },
      ]}
    />
  );
}
