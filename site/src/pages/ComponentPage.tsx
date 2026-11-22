import { Link, LinkButton } from "@senvenli/react/action";
import { Heading, Kbd, Text } from "@senvenli/react/display";
import { Breadcrumbs, Disclosure } from "@senvenli/react/navigation";
import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { DocsLayout } from "../components/DocsLayout";
import { CopyButton } from "../components/CopyButton";
import { DocText } from "../components/DocText";
import { ExampleBlock } from "../components/ExampleBlock";
import { OnThisPage, type PageSection } from "../components/OnThisPage";
import { PropsTable } from "../components/PropsTable";
import type { ExampleData } from "../examples/types";
import { familyTitle, type Manifest, type ManifestIndexEntry } from "../lib/manifest";

/**
 * A section: an h2 at heading-large with 24px under it. The space above is 64px between sections and 80px above the
 * API reference, so the guide and the reference read as two parts without tabs or rules.
 */
function Section({ id, title, children, wide = false }: { id: string; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={wide ? "mt-ds-1000 flex scroll-mt-24 flex-col gap-ds-300" : "mt-ds-800 flex scroll-mt-24 flex-col gap-ds-300"}>
      <Heading id={`${id}-title`} level={2} size="heading-large">
        {title}
      </Heading>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-ds-150">
      <Heading level={3} size="heading-small">
        {title}
      </Heading>
      {children}
    </div>
  );
}

/** Bullets at body-large; text passes through DocText, so `backticks` become code. */
function Bullets({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-ds-100 ps-ds-250 text-body-large text-ds-text marker:text-ds-text-subtlest">
      {items.map((item, index) => (
        <li key={index}>{typeof item === "string" ? <DocText text={item} inline /> : item}</li>
      ))}
    </ul>
  );
}

/**
 * A component's page, rendered from its manifest and its examples: one page, no tabs. The hero example comes first,
 * then the guide (examples, guidelines, accessibility), then the API reference, then where to go next.
 */
export function ComponentPage({ manifest, examples = [], components = [], importHtml }: {
  manifest: Manifest;
  examples?: ExampleData[];
  /** Every component in reading order, for the side list and previous / next. */
  components?: ManifestIndexEntry[];
  /** The import line, highlighted at build time. */
  importHtml?: string;
}) {
  const at = components.findIndex((item) => item.name === manifest.name);
  const previous = at > 0 ? components[at - 1] : undefined;
  const next = at >= 0 && at < components.length - 1 ? components[at + 1] : undefined;
  const importLine = `import { ${manifest.exports.join(", ")} } from "${manifest.import}";`;
  const [hero, ...more] = examples;
  const a11y = manifest.a11y;
  const hasA11y = !!(a11y.keyboard?.length || a11y.builtIn?.length || a11y.youProvide?.length);
  const propEntries = Object.entries(manifest.props).filter(([, props]) => props.length > 0);
  const hasReference = propEntries.length > 0 || manifest.tokens.length > 0;
  const titleOf = (slug: string) => components.find((item) => item.name === slug)?.title ?? slug;

  const sections: PageSection[] = [
    ...(more.length ? [{ id: "examples", title: "Examples", children: more.map((example) => ({ id: `example-${example.id}`, title: example.title })) }] : []),
    { id: "guidelines", title: "Guidelines" },
    ...(hasA11y ? [{ id: "accessibility", title: "Accessibility" }] : []),
    ...(hasReference
      ? [
          {
            id: "api-reference",
            title: "API reference",
            children: [
              ...(propEntries.length > 1 ? propEntries.map(([component]) => ({ id: `props-${component}`, title: component })) : []),
              ...(manifest.tokens.length ? [{ id: "tokens", title: "Tokens" }] : []),
            ],
          },
        ]
      : []),
    ...(manifest.related?.length ? [{ id: "related", title: "Related" }] : []),
  ];

  return (
    <DocsLayout aside={<OnThisPage sections={sections} />}>

      <main id="main" className="flex min-w-0 flex-col py-ds-600">
        <header className="flex flex-col gap-ds-150">
          {/* The family is a breadcrumb level only: the URL stays /docs/components/<slug>. The title is not repeated. */}
          <Breadcrumbs items={[{ label: "Components", href: "/docs/components" }, { label: familyTitle(manifest.family) }]} />
          <div className="flex flex-wrap items-center justify-between gap-ds-200">
            <Heading level={1} size="heading-xxlarge">
              {manifest.title}
            </Heading>
            <div className="flex items-center gap-ds-050">
              <CopyButton label="Copy page" getText={() => fetch(`/docs/components/${manifest.name}.md`).then((response) => response.text())} />
              {previous && (
                  <LinkButton size="small" variant="subtle" iconOnly iconBefore="arrow-left" aria-label={`Previous: ${previous.title}`} href={`/docs/components/${previous.name}`} />
              )}
              {next && (
                  <LinkButton size="small" variant="subtle" iconOnly iconBefore="arrow-right" aria-label={`Next: ${next.title}`} href={`/docs/components/${next.name}`} />
              )}
            </div>
          </div>
          <Text size="body-large" tone="subtle">
            {manifest.description}
          </Text>
          {/* Real links in the prerendered HTML: this is where agents find the page's Markdown and JSON. */}
          <div className="flex flex-wrap gap-ds-300 text-body-small">
            <Link variant="subtle" href={`/docs/components/${manifest.name}.md`}>
              Markdown
            </Link>
            <Link variant="subtle" href={`/docs/components/${manifest.name}.json`}>
              JSON
            </Link>
          </div>
        </header>

        {hero && (
          <div className="mt-ds-400">
            <ExampleBlock slug={manifest.name} family={manifest.family} example={hero} isHero />
          </div>
        )}

        <div className="mt-ds-600">
          <CodeBlock code={importLine} html={importHtml} copyLabel="Copy import" />
        </div>

        {more.length > 0 && (
          <Section id="examples" title="Examples">
            <div className="flex flex-col gap-ds-500">
              {more.map((example) => (
                <ExampleBlock key={example.id} slug={manifest.name} family={manifest.family} example={example} />
              ))}
            </div>
          </Section>
        )}

        <Section id="guidelines" title="Guidelines">
          <Subsection title="When to use it">
            <Bullets items={manifest.usage.when} />
          </Subsection>
          {!!manifest.usage.instead?.length && (
            <Subsection title="Use something else when">
              <Bullets
                items={manifest.usage.instead.map((item) => (
                  <>
                    <DocText text={item.when} inline />{" "}
                    <Link variant="inline" href={`/docs/components/${item.use}`}>
                      {titleOf(item.use)}
                    </Link>
                  </>
                ))}
              />
            </Subsection>
          )}
          {!!manifest.guidance?.length && (
            <Subsection title="Do and avoid">
              <Bullets
                items={manifest.guidance.map((item) => (
                  <div className="flex flex-col gap-ds-050">
                    <DocText text={item.rule} inline />
                    {(item.do || item.avoid) && (
                      <div className="grid gap-ds-200 md:grid-cols-2">
                        {item.do && (
                          <span className="text-body text-ds-text-subtle">
                            <span className="font-medium text-ds-text-success">Do</span> <DocText text={item.do} inline />
                          </span>
                        )}
                        {item.avoid && (
                          <span className="text-body text-ds-text-subtle">
                            <span className="font-medium text-ds-text-danger">Avoid</span> <DocText text={item.avoid} inline />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              />
            </Subsection>
          )}
        </Section>

        {hasA11y && (
          <Section id="accessibility" title="Accessibility">
            {!!a11y.keyboard?.length && (
              <Subsection title="Keyboard">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-start text-body">
                    <thead>
                      <tr className="text-ds-text-subtle">
                        <th scope="col" className="py-ds-100 pe-ds-300 text-start font-medium">Keys</th>
                        <th scope="col" className="py-ds-100 text-start font-medium">What happens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a11y.keyboard.map((row) => (
                        <tr key={row.keys} className="border-t border-ds-border align-top">
                          <th scope="row" className="py-ds-150 pe-ds-300 text-start font-normal whitespace-nowrap">
                            <Kbd>{row.keys}</Kbd>
                          </th>
                          <td className="py-ds-150 text-ds-text">
                            <DocText text={row.does} inline />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Subsection>
            )}
            {(!!a11y.builtIn?.length || !!a11y.youProvide?.length) && (
              <div className="grid gap-ds-400 md:grid-cols-2">
                {!!a11y.builtIn?.length && (
                  <Subsection title="Built in">
                    <Bullets items={a11y.builtIn} />
                  </Subsection>
                )}
                {!!a11y.youProvide?.length && (
                  <Subsection title="You provide">
                    <Bullets items={a11y.youProvide} />
                  </Subsection>
                )}
              </div>
            )}
          </Section>
        )}

        {hasReference && (
          <Section id="api-reference" title="API reference" wide>
            {propEntries.map(([component, props]) => (
              <div key={component} id={`props-${component}`} className="flex scroll-mt-24 flex-col gap-ds-150">
                <Heading level={3} size="heading-small">
                  <code className="font-ds-mono">{component}</code>
                </Heading>
                <PropsTable props={props} />
              </div>
            ))}
            {manifest.tokens.length > 0 && (
              <div id="tokens" className="scroll-mt-24">
                <Disclosure title={`Tokens it reads (${manifest.tokens.length})`} headingLevel={3}>
                  <ul className="m-0 grid list-none gap-ds-075 p-0 sm:grid-cols-2">
                    {manifest.tokens.map((token) => (
                      <li key={token}>
                        <code className="font-ds-mono text-code text-ds-text-subtle">--{token}</code>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              </div>
            )}
          </Section>
        )}

        {!!manifest.related?.length && (
          <Section id="related" title="Related">
            <ul className="m-0 flex list-none flex-wrap gap-x-ds-400 gap-y-ds-150 p-0 text-body-large">
              {manifest.related.map((slug) => (
                <li key={slug}>
                  <Link href={`/docs/components/${slug}`}>{titleOf(slug)}</Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(previous || next) && (
          <nav aria-label="Previous and next" className="mt-ds-800 grid grid-cols-2 gap-ds-200">
            <div>{previous && <PageLink direction="previous" href={`/docs/components/${previous.name}`} title={previous.title} />}</div>
            <div>{next && <PageLink direction="next" href={`/docs/components/${next.name}`} title={next.title} />}</div>
          </nav>
        )}
      </main>
    </DocsLayout>
  );
}

/** A whole-block link to the previous or next page: a small label over the title; tone on hover, no rule. */
function PageLink({ direction, href, title }: { direction: "previous" | "next"; href: string; title: string }) {
  const end = direction === "next";
  return (
    <LinkButton variant="subtle" href={href} iconBefore={end ? undefined : "arrow-left"} iconAfter={end ? "arrow-right" : undefined}>
      <span className={end ? "flex flex-col items-end" : "flex flex-col items-start"}>
        <span className="text-body-small font-normal text-ds-text-subtle">{end ? "Next" : "Previous"}</span>
        <span>{title}</span>
      </span>
    </LinkButton>
  );
}
