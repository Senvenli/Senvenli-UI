import { Button } from "@senvenli/react/action";
import { toast } from "@senvenli/react/overlay";

// One toast for a task that takes a moment: a spinner while it runs, then the result in place.
export default function Example() {
  const save = () => new Promise<string>((resolve) => setTimeout(() => resolve("ORD-0914"), 1500));
  return (
    <Button
      variant="primary"
      onPress={() =>
        void toast.promise(save(), {
          loading: "Saving the order…",
          success: (id) => `Order ${id} saved`,
          error: "The order was not saved",
        })
      }
    >
      Save order
    </Button>
  );
}
