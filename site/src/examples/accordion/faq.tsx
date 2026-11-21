import { Accordion } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Accordion
      defaultExpandedKeys={["plans"]}
      items={[
        { id: "plans", title: "Can I change plans later?", content: "Yes. Upgrade or downgrade at any time; the price is adjusted on your next invoice." },
        { id: "trial", title: "Is there a free trial?", content: "Every plan starts with 14 days free. No card is needed until the trial ends." },
        { id: "invoices", title: "Where do I find my invoices?", content: "Under Settings, then Billing. Each invoice is also emailed to the billing contact." },
      ]}
    />
  );
}
