import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { Breadcrumbs } from "@senvenli/react/navigation";
import { CodeBlock } from "../components/CodeBlock";
import { CopyButton } from "../components/CopyButton";
import { DocsNav } from "../components/DocsNav";
import { OnThisPage } from "../components/OnThisPage";
import type { DocHeading, DocMeta, DocPart } from "../lib/docs.server";

/** A doc: the Markdown rendered as prose at the docs scale, its code blocks as the site's CodeBlock, beside the docs list. */
export function DocPage({ meta, parts, headings, docs }: { meta: DocMeta; parts: DocPart[]; headings: DocHeading[]; docs: DocMeta[] }) {
  const at = docs.findIndex((doc) => doc.slug === meta.slug);
  const previous = at > 0 ? docs[at - 1] : undefined;
  const next = at >= 0 && at < docs.length - 1 ? docs[at + 1] : undefined;
  return (
    <div className="mx-auto grid w-full max-w-[1360px] gap-ds-600 px-ds-200 sm:px-ds-300 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,47.5rem)_12.5rem]">
      <aside className="hidden lg:block">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          <DocsNav docs={docs} current={meta.slug} />
        </div>
      </aside>

      <main id="main" className="flex min-w-0 flex-col py-ds-600">
        <header className="flex flex-col gap-ds-150">
          <Breadcrumbs items={[{ label: "Docs", href: "/docs/getting-started" }, { label: meta.group }]} />
          <div className="flex flex-wrap items-center justify-between gap-ds-200">
            <Heading level={1} size="heading-xxlarge">
              {meta.title}
            </Heading>
            <CopyButton label="Copy page" getText={() => fetch(`/docs/${meta.slug}.md`).then((response) => response.text())} />
          </div>
          <Text size="body-large" tone="subtle">
            {meta.description}
          </Text>
          <div className="text-body-small">
            <Link variant="subtle" href={`/docs/${meta.slug}.md`}>
              Markdown
            </Link>
          </div>
        </header>

        <article data-slot="doc-prose" className="doc-prose mt-ds-500">
          {parts.map((part, index) =>
            part.kind === "html" ? (
              <div key={index} dangerouslySetInnerHTML={{ __html: part.html }} />
            ) : (
              <div key={index} className="doc-code">
                <CodeBlock code={part.code} html={part.html} variants={part.variants} label={part.lang === "bash" ? "Terminal" : part.lang} />
              </div>
            ),
          )}
        </article>

        {(previous || next) && (
          <nav aria-label="Previous and next" className="mt-ds-800 grid grid-cols-2 gap-ds-200 text-body-large">
            <div>{previous && <Link href={`/docs/${previous.slug}`}>{`← ${previous.title}`}</Link>}</div>
            <div className="text-end">{next && <Link href={`/docs/${next.slug}`}>{`${next.title} →`}</Link>}</div>
          </nav>
        )}
      </main>

      <aside className="hidden xl:block">
        <div className="sticky top-14 pt-ds-600">
          <OnThisPage sections={headings} />
        </div>
      </aside>
    </div>
  );
}
