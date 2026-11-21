import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { Dialog, DialogTrigger } from "@senvenli/react/overlay";

const SIZES = [
  { size: "small", width: "440px" },
  { size: "medium", width: "600px" },
  { size: "large", width: "800px" },
  { size: "xlarge", width: "1152px" },
] as const;

export default function Example() {
  return (
    <Inline space="space-100">
      {SIZES.map(({ size, width }) => (
        <DialogTrigger key={size}>
          <Button>{size}</Button>
          <Dialog size={size} title="Order ORD-1040" secondaryAction={{ label: "Close" }}>
            <Text>
              This dialog is {size}: up to {width} wide, or the viewport less its margins.
            </Text>
          </Dialog>
        </DialogTrigger>
      ))}
    </Inline>
  );
}
