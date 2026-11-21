import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { familyTitle, orderComponents, type ManifestIndexEntry } from "../lib/manifest";

/** Every component as rows grouped by family, from the smallest pieces to the composed ones. */
export function ComponentsIndexPage({ components }: { components: ManifestIndexEntry[] }) {
  const ordered = orderComponents(components);
  const families = [...new Set(ordered.map((item) => item.family))];
  return (
    <main id="main" className="mx-auto flex max-w-4xl flex-col gap-ds-500 px-ds-300 py-ds-600">
      <div className="flex flex-col gap-ds-100">
        <Heading level={1} size="heading-xlarge">
          Components
        </Heading>
        <Text size="body-large" tone="subtle">
          {`${components.length} components in ${families.length} families, built on React Aria.`}
        </Text>
      </div>
      {families.map((family) => (
        <section key={family} aria-labelledby={`family-${family}`} className="flex flex-col gap-ds-150">
          <Heading id={`family-${family}`} level={2} size="heading-medium">
            {familyTitle(family)}
          </Heading>
          <ul className="m-0 flex list-none flex-col p-0">
            {ordered
              .filter((item) => item.family === family)
              .map((item) => (
                <li key={item.name} className="flex flex-col gap-ds-025 border-b border-ds-border py-ds-150 sm:flex-row sm:items-baseline sm:gap-ds-300">
                  <span className="shrink-0 sm:w-56">
                    <Link href={`/components/${item.name}`}>{item.title}</Link>
                  </span>
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
