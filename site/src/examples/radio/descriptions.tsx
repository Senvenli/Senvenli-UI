import { Radio, RadioGroup } from "@senvenli/react/selection";

export default function Example() {
  return (
    <RadioGroup label="Delivery" description="Applies to every order in this shipment." defaultValue="standard">
      <Radio value="standard" description="3–5 business days, free.">
        Standard
      </Radio>
      <Radio value="express" description="Next business day, $12.">
        Express
      </Radio>
      <Radio value="pickup" description="Not available for this address." isDisabled>
        Store pickup
      </Radio>
    </RadioGroup>
  );
}
