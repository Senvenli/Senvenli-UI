import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { familyTitle, type ManifestIndexEntry } from "../lib/manifest";

export function ComponentsIndexPage({ components }: { components: ManifestIndexEntry[] }) {
  const families = [...new Set(components.map((item) => item.family))].sort();
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-ds-400 px-ds-300 py-ds-600">
      <Heading level={1} size="heading-xlarge">
        Components
      </Heading>
      {families.map((family) => (
        <section key={family} aria-label={familyTitle(family)} className="flex flex-col gap-ds-150">
          <Heading level={2} size="heading-medium">
            {familyTitle(family)}
          </Heading>
          <ul className="m-0 grid list-none gap-ds-150 p-0 md:grid-cols-2">
            {components
              .filter((item) => item.family === family)
              .map((item) => (
                <li key={item.name} className="flex flex-col">
                  <Link href={`/components/${item.name}`}>{item.title}</Link>
                  <Text size="body-small" tone="subtle">
                    {item.description}
                  </Text>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
