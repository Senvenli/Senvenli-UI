import { Link } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Accordion, Disclosure } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Accordion defaultExpandedKeys={["shipping"]}>
      <Disclosure id="shipping" title="How long does shipping take?">
        <ul className="m-0 flex list-disc flex-col gap-ds-050 ps-ds-300">
          <li>Standard: 3 to 5 working days</li>
          <li>Express: next working day, ordered before 2 pm</li>
        </ul>
      </Disclosure>
      <Disclosure id="returns" title="Can I return an order?">
        <Text>
          Within 30 days, unused and in its box. <Link href="#returns">Start a return</Link>
        </Text>
      </Disclosure>
      <Disclosure id="contact" title="How do I reach support?">
        <Text>Write to us from the Help page; we answer within one working day.</Text>
      </Disclosure>
    </Accordion>
  );
}
