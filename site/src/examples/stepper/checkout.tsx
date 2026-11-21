import { Button } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { Stepper } from "@senvenli/react/navigation";
import { useState } from "react";

const STEPS = [
  { id: "cart", label: "Cart" },
  { id: "delivery", label: "Delivery" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

export default function Example() {
  const [current, setCurrent] = useState("payment");
  const next = STEPS[STEPS.findIndex((step) => step.id === current) + 1];
  return (
    <Stack space="space-300" align="start">
      <div className="w-full">
        <Stepper aria-label="Checkout" steps={STEPS} currentStep={current} onStepPress={setCurrent} />
      </div>
      <Button variant="primary" isDisabled={!next} onPress={() => next && setCurrent(next.id)}>
        Continue
      </Button>
    </Stack>
  );
}
