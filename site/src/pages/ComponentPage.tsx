import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { Breadcrumbs, Disclosure } from "@senvenli/react/navigation";
import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { ComponentNav } from "../components/ComponentNav";
import { CopyButton } from "../components/CopyButton";
import { ExampleBlock } from "../components/ExampleBlock";
import { OnThisPage, type PageSection } from "../components/OnThisPage";
import { PropsTable } from "../components/PropsTable";
import type { ExampleData } from "../examples/types";
import { familyTitle, type Manifest, type ManifestIndexEntry } from "../lib/manifest";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-20 flex-col gap-ds-200">
      <Heading id={`${id}-title`} level={2} size="heading-medium">
        {title}
      </Heading>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-ds-075 ps-ds-250 text-body text-ds-text marker:text-ds-text-subtlest">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * A component's page, rendered from its manifest and its examples: one page, no tabs. The order follows the
 * product plan: what it is, how it looks, when to use it, how it behaves for everyone, its API, and where to go next.
 */
export function ComponentPage({ manifest, examples = [], components = [], importHtml }: {
  manifest: Manifest;
  /** The import line, highlighted at build time. */
  importHtml?: string;
  examples?: ExampleData[];
  /** Every component in reading order, for the side list and previous / next. */
  components?: ManifestIndexEntry[];
}) {
  const at = components.findIndex((item) => item.name === manifest.name);
  const previous = at > 0 ? components[at - 1] : undefined;
  const next = at >= 0 && at < components.length - 1 ? components[at + 1] : undefined;
  const importLine = `import { ${manifest.exports.join(", ")} } from "${manifest.import}";`;
  const [primary, ...variants] = examples;
  const a11y = manifest.a11y;
  const hasA11y = !!(a11y.keyboard?.length || a11y.builtIn?.length || a11y.youProvide?.length);
  const propEntries = Object.entries(manifest.props).filter(([, props]) => props.length > 0);

  const sections: PageSection[] = [
    ...(variants.length ? [{ id: "examples", title: "Examples" }] : []),
    { id: "usage", title: "Usage" },
    ...(hasA11y ? [{ id: "accessibility", title: "Accessibility" }] : []),
    ...(propEntries.length ? [{ id: "props", title: "Props" }] : []),
    ...(manifest.tokens.length ? [{ id: "tokens", title: "Tokens" }] : []),
    ...(manifest.related?.length ? [{ id: "related", title: "Related" }] : []),
  ];

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-ds-600 px-ds-300 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_11rem]">
      <aside className="hidden lg:block">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto pt-ds-600">
          <ComponentNav components={components} current={manifest.name} />
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-ds-600 py-ds-600">
        <header className="flex flex-col gap-ds-200">
          {/* The family is a breadcrumb level only: the URL stays /components/<slug>. */}
          <Breadcrumbs items={[{ label: "Components", href: "/components" }, { label: familyTitle(manifest.family) }, { label: manifest.title }]} />
          <Heading level={1} size="heading-xlarge">
            {manifest.title}
          </Heading>
          <Text size="body-large" tone="subtle">
            {manifest.description}
          </Text>
          <CodeBlock code={importLine} html={importHtml} label="Copy import" />
          <div className="flex flex-wrap items-center gap-ds-200 text-body-small">
            <CopyButton label="Copy page" getText={() => fetch(`/components/${manifest.name}.md`).then((response) => response.text())} />
            <Link variant="subtle" href={`/components/${manifest.name}.md`}>
              Markdown
            </Link>
            <Link variant="subtle" href={`/components/${manifest.name}.json`}>
              JSON
            </Link>
          </div>
        </header>

        {primary && <ExampleBlock slug={manifest.name} example={primary} headingLevel={2} />}

        {variants.length > 0 && (
          <Section id="examples" title="Examples">
            <div className="flex flex-col gap-ds-500">
              {variants.map((example) => (
                <ExampleBlock key={example.id} slug={manifest.name} example={example} />
              ))}
            </div>
          </Section>
        )}

        <Section id="usage" title="Usage">
          <div className="flex flex-col gap-ds-150">
            <Heading level={3} size="heading-small">
              When to use it
            </Heading>
            <Bullets items={manifest.usage.when} />
          </div>
          {!!manifest.usage.instead?.length && (
            <div className="flex flex-col gap-ds-150">
              <Heading level={3} size="heading-small">
                Use something else when
              </Heading>
              <Bullets
                items={manifest.usage.instead.map((item) => (
                  <>
                    {item.when} <Link href={`/components/${item.use}`}>{titleOf(components, item.use)}</Link>
                  </>
                ))}
              />
            </div>
          )}
          {!!manifest.guidance?.length && (
            <div className="flex flex-col gap-ds-150">
              <Heading level={3} size="heading-small">
                Guidance
              </Heading>
              <Bullets
                items={manifest.guidance.map((item) => (
                  <div className="flex flex-col gap-ds-025">
                    <span>{item.rule}</span>
                    {item.do && (
                      <span className="text-body-small text-ds-text-subtle">
                        <span className="font-medium text-ds-text-success">Do:</span> {item.do}
                      </span>
                    )}
                    {item.avoid && (
                      <span className="text-body-small text-ds-text-subtle">
                        <span className="font-medium text-ds-text-danger">Avoid:</span> {item.avoid}
                      </span>
                    )}
                  </div>
                ))}
              />
            </div>
          )}
        </Section>

        {hasA11y && (
          <Section id="accessibility" title="Accessibility">
            {!!a11y.keyboard?.length && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-body-small">
                  <thead>
                    <tr className="border-b border-ds-border text-ds-text-subtle">
                      <th scope="col" className="py-ds-100 pe-ds-200 text-start font-medium">Keys</th>
                      <th scope="col" className="py-ds-100 text-start font-medium">What happens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a11y.keyboard.map((row) => (
                      <tr key={row.keys} className="border-b border-ds-border align-top">
                        <th scope="row" className="py-ds-100 pe-ds-200 text-start font-normal whitespace-nowrap">
                          <code className="font-ds-mono text-code">{row.keys}</code>
                        </th>
                        <td className="py-ds-100 text-ds-text">{row.does}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!!a11y.builtIn?.length && (
              <div className="flex flex-col gap-ds-150">
                <Heading level={3} size="heading-small">
                  Built in
                </Heading>
                <Bullets items={a11y.builtIn} />
              </div>
            )}
            {!!a11y.youProvide?.length && (
              <div className="flex flex-col gap-ds-150">
                <Heading level={3} size="heading-small">
                  You provide
                </Heading>
                <Bullets items={a11y.youProvide} />
              </div>
            )}
          </Section>
        )}

        {propEntries.length > 0 && (
          <Section id="props" title="Props">
            {propEntries.map(([component, props]) =>
              propEntries.length > 1 ? (
                <div key={component} className="flex flex-col gap-ds-150">
                  <Heading level={3} size="heading-small">
                    <code className="font-ds-mono">{component}</code>
                  </Heading>
                  <PropsTable props={props} />
                </div>
              ) : (
                <PropsTable key={component} props={props} />
              ),
            )}
          </Section>
        )}

        {manifest.tokens.length > 0 && (
          <Section id="tokens" title="Tokens">
            <Text tone="subtle">The theme tokens it reads. A theme that sets them changes this component.</Text>
            <Disclosure title={`${manifest.tokens.length} tokens`} headingLevel={3}>
              <ul className="m-0 grid list-none gap-ds-050 p-0 sm:grid-cols-2">
                {manifest.tokens.map((token) => (
                  <li key={token}>
                    <code className="font-ds-mono text-code text-ds-text-subtle">--{token}</code>
                  </li>
                ))}
              </ul>
            </Disclosure>
          </Section>
        )}

        {!!manifest.related?.length && (
          <Section id="related" title="Related">
            <ul className="m-0 flex list-none flex-wrap gap-x-ds-300 gap-y-ds-100 p-0">
              {manifest.related.map((slug) => (
                <li key={slug}>
                  <Link href={`/components/${slug}`}>{titleOf(components, slug)}</Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(previous || next) && (
          <nav aria-label="Previous and next" className="flex justify-between gap-ds-300 border-t border-ds-border pt-ds-300 text-body">
            <span>{previous && <Link href={`/components/${previous.name}`}>{`← ${previous.title}`}</Link>}</span>
            <span>{next && <Link href={`/components/${next.name}`}>{`${next.title} →`}</Link>}</span>
          </nav>
        )}
      </main>

      <aside className="hidden xl:block">
        <div className="sticky top-14 pt-ds-600">
          <OnThisPage sections={sections} />
        </div>
      </aside>
    </div>
  );
}

function titleOf(components: ManifestIndexEntry[], slug: string): string {
  return components.find((item) => item.name === slug)?.title ?? slug;
}
