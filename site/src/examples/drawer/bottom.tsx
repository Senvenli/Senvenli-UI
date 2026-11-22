import { Button } from "@senvenli/react/action";
import { DialogTrigger, Drawer } from "@senvenli/react/overlay";
import { RadioGroup } from "@senvenli/react/selection";

export default function Example() {
  return (
    <DialogTrigger>
      <Button iconBefore="arrow-up-down">Sort</Button>
      <Drawer position="bottom" title="Sort orders">
        <RadioGroup
          label="Sort by"
          defaultValue="newest"
          items={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "total", label: "Highest total" },
          ]}
        />
      </Drawer>
    </DialogTrigger>
  );
}
