import { Link } from "@senvenli/react/action";
import { Banner } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack space="space-150">
      <Banner tone="success" title="Bank account verified">
        Payouts start with your next invoice.
      </Banner>
      <Banner tone="warning" title="Storage is almost full">
        You have used 46 of 50 GB. Remove files or upgrade to keep uploading.
      </Banner>
      <Banner tone="danger" title="Payment failed" actions={<Link href="#billing">Update payment method</Link>}>
        We could not charge the card ending in 4242. Update it to keep your plan.
      </Banner>
    </Stack>
  );
}
