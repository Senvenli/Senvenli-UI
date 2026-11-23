import { Stack } from "@senvenli/react/layout";
import { Slider } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Stack space="space-300">
      <Slider label="Small" size="small" defaultValue={30} />
      <Slider label="Medium" defaultValue={50} />
      <Slider label="Large" size="large" defaultValue={70} />
    </Stack>
  );
}
