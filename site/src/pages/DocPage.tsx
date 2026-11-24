import { Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { CodeBlock } from "../components/CodeBlock";
import { ExampleBlock } from "../components/ExampleBlock";
import { CopyButton } from "../components/CopyButton";
import { DocsLayout } from "../components/DocsLayout";
import { OnThisPage } from "../components/OnThisPage";
import type { DocHeading, DocMeta, DocPart } from "../lib/docs.server";

/** A doc: the Markdown rendered as prose at the docs scale, its code blocks as the site's CodeBlock, beside the docs list. */
export function DocPage({ meta, parts, headings, docs }: { meta: DocMeta; parts: DocPart[]; headings: DocHeading[]; docs: DocMeta[] }) {
  // Reading order as the sidebar shows it: the introduction, then every doc.
  const at = docs.findIndex((doc) => doc.slug === meta.slug);
  const previous = at > 0 ? docs[at - 1] : undefined;
  const next = at >= 0 && at < docs.length - 1 ? docs[at + 1] : undefined;
  return (
    <DocsLayout aside={<OnThisPage sections={headings} />}>

      <main id="main" className="flex min-w-0 flex-col py-ds-600">
        <header className="flex flex-col gap-ds-150">
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
            ) : part.kind === "example" ? (
              <div key={index} className="doc-example my-ds-300">
                <ExampleBlock slug={part.slug} family={part.family} example={part.example} />
              </div>
            ) : (
              <div key={index} className="doc-code">
                <CodeBlock code={part.code} html={part.html} variants={part.variants} label={part.lang === "bash" ? "Terminal" : part.lang} prompt={part.lang === "bash"} />
              </div>
            ),
          )}
        </article>

        {(previous || next) && (
          <nav aria-label="Previous and next" className="mt-ds-800 grid grid-cols-2 gap-ds-200 text-body-large">
            <div>{previous && <Link href={previous.slug === "introduction" ? "/docs" : `/docs/${previous.slug}`}>{`← ${previous.title}`}</Link>}</div>
            <div className="text-end">{next && <Link href={`/docs/${next.slug}`}>{`${next.title} →`}</Link>}</div>
          </nav>
        )}
      </main>
    </DocsLayout>
  );
}
