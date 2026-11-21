import { Button } from "@senvenli/react/action";
import { DescriptionList } from "@senvenli/react/display";
import { Popover } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Popover aria-label="Payment details" placement="top" trigger={<Button variant="link">Paid by card ending 4242</Button>}>
      <DescriptionList
        layout="stacked"
        items={[
          { label: "Paid on", value: "March 18, 2026" },
          { label: "Amount", value: "$248.00" },
          { label: "Reference", value: "PAY-88213", copyValue: "PAY-88213" },
        ]}
      />
    </Popover>
  );
}
