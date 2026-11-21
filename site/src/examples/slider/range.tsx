import { Slider } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [price, setPrice] = useState<[number, number]>([200, 800]);
  return (
    <div className="max-w-80">
      <Slider
        label="Order total"
        description="Orders outside the range are hidden."
        minValue={0}
        maxValue={1000}
        step={50}
        formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        value={price}
        onChange={setPrice}
      />
    </div>
  );
}
