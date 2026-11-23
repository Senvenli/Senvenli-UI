import { Stepper } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Stepper
      aria-label="Payout setup"
      orientation="vertical"
      currentStep="documents"
      steps={[
        { id: "signup", label: "Sign up", isDone: true },
        { id: "documents", label: "Identity documents", description: "Upload a photo of your ID.", status: "needs-you" },
        { id: "bank", label: "Bank account", status: "with-provider", statusText: "With the bank · 1–2 business days" },
        { id: "tax", label: "Tax details", description: "The tax number did not match. Enter it again.", status: "failed" },
      ]}
    />
  );
}
