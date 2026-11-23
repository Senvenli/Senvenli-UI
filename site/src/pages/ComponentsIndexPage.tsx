import { Button, Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { EmptyState } from "@senvenli/react/feedback";
import { Input } from "@senvenli/react/form";
import { Pressable } from "@senvenli/react/action";
import { useMemo, useState } from "react";
import { DocsLayout } from "../components/DocsLayout";
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
  const shown = words.length
    ? ordered.filter((item) => words.every((word) => fold(`${item.title} ${item.family} ${item.description}`).includes(word)))
    : ordered;
  const families = allFamilies.filter((family) => shown.some((item) => item.family === family));

  return (
    <DocsLayout>
      <main id="main" className="flex min-w-0 flex-col gap-ds-600 py-ds-600">
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
              <Input type="search" aria-label="Filter components" placeholder="Filter by name or purpose" value={query} onChange={setQuery} />
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
              <section
                key={family}
                id={`family-${family}`}
                aria-labelledby={`family-${family}-title`}
                className="flex scroll-mt-24 flex-col gap-ds-200"
              >
                <div className="flex items-baseline gap-ds-150">
                  <Heading id={`family-${family}-title`} level={2} size="heading-large">
                    {familyTitle(family)}
                  </Heading>
                  <span className="text-body text-ds-text-subtlest">{items.length}</span>
                </div>
                {/* As shadcn's list: no card ground, a soft fill on hover; the name leads, one quiet line under it. */}
                <ul className="m-0 grid list-none gap-ds-050 p-0 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <li key={item.name} className="flex">
                      <Pressable href={`/docs/components/${item.name}`} radius="large" paddingInline="space-150" paddingBlock="space-100">
                        <span className="flex h-full flex-col gap-ds-025">
                          <span className="text-body-large font-medium text-ds-text">{item.title}</span>
                          <span className="line-clamp-2 text-body-small text-ds-text-subtle">{item.description}</span>
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
    </DocsLayout>
  );
}
