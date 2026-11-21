import { Button } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";
import { toast } from "@senvenli/react/overlay";
import { useRef } from "react";

export default function Example() {
  const key = useRef<string | null>(null);
  return (
    <Inline space="space-100">
      <Button
        onPress={() => {
          if (key.current) toast.dismiss(key.current);
          key.current = toast({ title: "Import started", description: "1,204 customers · this can take a minute.", timeout: 0 });
        }}
      >
        Start import
      </Button>
      <Button variant="subtle" onPress={() => key.current && toast.dismiss(key.current)}>
        Dismiss it
      </Button>
    </Inline>
  );
}
