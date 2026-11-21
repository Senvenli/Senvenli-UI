import { RadioCard } from "@senvenli/react/selection";

export default function Example() {
  return (
    <RadioCard
      label="Payment method"
      description="You can change it before each invoice is due."
      defaultValue="card"
      items={[
        { value: "card", title: "Card", description: "Charged on the invoice date." },
        { value: "transfer", title: "Bank transfer", description: "Due within 14 days." },
        { value: "direct-debit", title: "Direct debit", description: "Not available in your country yet.", isDisabled: true },
      ]}
    />
  );
}
