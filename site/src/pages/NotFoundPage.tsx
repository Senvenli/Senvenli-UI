import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-ds-200 px-ds-300 py-ds-800">
      <Heading level={1} size="heading-xlarge">
        Page not found
      </Heading>
      <Text tone="subtle">This address has no page. Check the link, or start from the component list.</Text>
      <Link href="/components">See all components</Link>
    </main>
  );
}
