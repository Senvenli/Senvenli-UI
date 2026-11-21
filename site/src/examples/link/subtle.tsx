import { Link } from "@senvenli/react/action";
import { Inline } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Inline space="space-200">
      <Link href="#" variant="subtle">
        Privacy policy
      </Link>
      <Link href="#" variant="subtle">
        Terms of service
      </Link>
      <Link href="#" variant="subtle">
        System status
      </Link>
    </Inline>
  );
}
