import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";

export function HomePage({ componentCount }: { componentCount: number }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-ds-200 px-ds-300 py-ds-800">
      <Heading level={1} size="heading-xlarge">
        Senvenli UI
      </Heading>
      <Text size="body-large">A design system that themes itself from zero inputs.</Text>
      <Text tone="subtle">{componentCount} components, each with a page for people and a Markdown and JSON copy for agents.</Text>
      <div className="flex gap-ds-200">
        <Link href="/create">Create a theme</Link>
        <Link href="/components">Browse components</Link>
      </div>
    </main>
  );
}
