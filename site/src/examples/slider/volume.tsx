import { Slider } from "@senvenli/react/selection";

export default function Example() {
  return (
    <div className="max-w-80">
      <Slider label="Volume" defaultValue={60} />
    </div>
  );
}
