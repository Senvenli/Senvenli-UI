import { Button } from "@senvenli/react/action";
import { toast } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Button
      iconBefore="archive"
      onPress={() =>
        toast({
          title: "Project archived",
          description: "Atlas moved to the archive.",
          action: { label: "Undo", onPress: () => toast.success("Project restored") },
        })
      }
    >
      Archive project
    </Button>
  );
}
