import { Button, Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { EmptyState } from "@senvenli/react/feedback";
import { SearchField } from "@senvenli/react/form";
import { Pressable } from "@senvenli/react/layout";
import { useMemo, useState } from "react";
import { familyTitle, orderComponents, type ManifestIndexEntry } from "../lib/manifest";

/** Case and accent insensitive, as the reader types it. */
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Every component, grouped by family from the smallest pieces to the composed ones, as cards that are links. A filter
 * over title, family and description narrows the list; a row of family links jumps down the page.
 */
export function ComponentsIndexPage({ components }: { components: ManifestIndexEntry[] }) {
  const ordered = useMemo(() => orderComponents(components), [components]);
  const allFamilies = [...new Set(ordered.map((item) => item.family))];
  const [query, setQuery] = useState("");
  const words = fold(query).split(/\s+/).filter(Boolean);
  const shown = words.length ? ordered.filter((item) => words.every((word) => fold(`${item.title} ${item.family} ${item.description}`).includes(word))) : ordered;
  const families = allFamilies.filter((family) => shown.some((item) => item.family === family));

  return (
    <main id="main" className="mx-auto flex w-full max-w-[1360px] flex-col gap-ds-600 px-ds-200 py-ds-600 sm:px-ds-300">
      <header className="flex flex-col gap-ds-150">
        <Heading level={1} size="heading-xxlarge">
          Components
        </Heading>
        <Text size="body-large" tone="subtle">
          {`${components.length} components in ${allFamilies.length} families, built on React Aria. Each page has live examples, guidelines, accessibility and the full API.`}
        </Text>
      </header>

      <div className="flex flex-col gap-ds-200">
        <div className="flex flex-wrap items-center gap-ds-300">
          <div className="w-full max-w-sm">
            <SearchField aria-label="Filter components" placeholder="Filter by name or purpose" value={query} onChange={setQuery} />
          </div>
          <Text size="body-small" tone="subtle">
            <span aria-live="polite">{words.length ? `${shown.length} of ${components.length}` : ""}</span>
          </Text>
        </div>
        {!words.length && (
          <nav aria-label="Families" className="flex flex-wrap gap-x-ds-300 gap-y-ds-100 text-body">
            {allFamilies.map((family) => (
              <Link key={family} variant="subtle" href={`#family-${family}`}>
                {familyTitle(family)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon="search"
          title={`No component matches “${query}”`}
          description="Try a shorter word, or what the component is for: “date”, “upload”, “table”."
          primaryAction={<Button onPress={() => setQuery("")}>Clear filter</Button>}
        />
      ) : (
        families.map((family) => {
          const items = shown.filter((item) => item.family === family);
          return (
            <section key={family} id={`family-${family}`} aria-labelledby={`family-${family}-title`} className="flex scroll-mt-24 flex-col gap-ds-200">
              <div className="flex items-baseline gap-ds-150">
                <Heading id={`family-${family}-title`} level={2} size="heading-large">
                  {familyTitle(family)}
                </Heading>
                <span className="text-body text-ds-text-subtlest">{items.length}</span>
              </div>
              <ul className="m-0 grid list-none gap-ds-150 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <li key={item.name} className="flex">
                    <Pressable href={`/components/${item.name}`} background="surface-sunken" radius="large" padding="space-200">
                      <span className="flex h-full flex-col gap-ds-075">
                        <span className="text-body-large font-medium text-ds-text">{item.title}</span>
                        <span className="line-clamp-2 text-body text-ds-text-subtle">{item.description}</span>
                      </span>
                    </Pressable>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
