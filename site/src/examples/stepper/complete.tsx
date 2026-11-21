import { Stepper } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Stepper
      aria-label="Order progress"
      isComplete
      currentStep="delivered"
      steps={[
        { id: "placed", label: "Placed" },
        { id: "packed", label: "Packed" },
        { id: "shipped", label: "Shipped" },
        { id: "delivered", label: "Delivered" },
      ]}
    />
  );
}
