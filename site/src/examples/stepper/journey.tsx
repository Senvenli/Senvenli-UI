import { Stepper } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Stepper
      aria-label="Payout setup"
      orientation="vertical"
      currentStep="documents"
      completedSteps={["signup"]}
      stepStatus={{ documents: "needs-you", bank: "with-provider", tax: "failed" }}
      statusText={{ bank: "With the bank · 1–2 business days" }}
      steps={[
        { id: "signup", label: "Sign up" },
        { id: "documents", label: "Identity documents", description: "Upload a photo of your ID." },
        { id: "bank", label: "Bank account" },
        { id: "tax", label: "Tax details", description: "The tax number did not match. Enter it again." },
      ]}
    />
  );
}
