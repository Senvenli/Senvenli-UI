import { Link } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";

export default function Example() {
  return (
    <Text elementType="p">
      By placing an order you agree to{" "}
      <Link href="#" variant="inline">
        the terms of service
      </Link>{" "}
      and{" "}
      <Link href="#" variant="inline">
        the privacy policy
      </Link>
      .
    </Text>
  );
}
