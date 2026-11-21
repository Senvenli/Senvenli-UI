import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";
import { toast } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Inline space="space-100">
      <Button onPress={() => toast.success("Changes saved")}>Success</Button>
      <Button onPress={() => toast.information("Export started", { description: "You get an email when the file is ready." })}>Information</Button>
      <Button onPress={() => toast.danger("Upload failed", { description: "The file is larger than 10 MB." })}>Danger</Button>
    </Inline>
  );
}
