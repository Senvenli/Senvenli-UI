import { Calendar } from "@senvenli/react/date";
import { ClientOnly } from "../../lib/client-only";

/** A bare Calendar opens on today's month, which a prerendered page cannot know: render it after mount. */
export default function Example() {
  return <ClientOnly minHeight={326}>{() => <Calendar aria-label="This month" />}</ClientOnly>;
}
