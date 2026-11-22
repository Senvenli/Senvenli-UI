import { Link } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Stack direction="horizontal" space="space-200">
      <Link href="#" variant="subtle">
        Privacy policy
      </Link>
      <Link href="#" variant="subtle">
        Terms of service
      </Link>
      <Link href="#" variant="subtle">
        System status
      </Link>
    </Stack>
  );
}
