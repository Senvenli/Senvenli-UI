import { Link } from "@senvenli/react/action";
import { Banner } from "@senvenli/react/feedback";

export default function Example() {
  return (
    <Banner
      title="Your trial ends in 3 days"
      actions={
        <>
          <Link href="#plans">Choose a plan</Link>
          <Link href="#compare">Compare plans</Link>
        </>
      }
    >
      Add a payment method to keep your projects and invoices after March 21.
    </Banner>
  );
}
