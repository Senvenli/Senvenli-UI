import { Button } from "@senvenli/react/action";
import { Popover } from "@senvenli/react/overlay";
import { Checkbox, CheckboxGroup } from "@senvenli/react/selection";

export default function Example() {
  return (
    <Popover title="Filters" trigger={<Button iconBefore="list-filter">Filters</Button>}>
      <CheckboxGroup label="Status" defaultValue={["open"]}>
        <Checkbox value="open">Open</Checkbox>
        <Checkbox value="paid">Paid</Checkbox>
        <Checkbox value="overdue">Overdue</Checkbox>
      </CheckboxGroup>
    </Popover>
  );
}
