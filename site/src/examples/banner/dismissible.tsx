import { Button } from "@senvenli/react/action";
import { Banner } from "@senvenli/react/feedback";
import { useState } from "react";

export default function Example() {
  const [isOpen, setOpen] = useState(true);
  if (!isOpen) return <Button onPress={() => setOpen(true)}>Show the banner again</Button>;
  return (
    <Banner title="Invoices have a new layout" onDismiss={() => setOpen(false)} dismissLabel="Close the layout notice">
      Totals and tax now sit at the top of every invoice.
    </Banner>
  );
}
