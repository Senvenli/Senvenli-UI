import { Link } from "@senvenli/react/action";
import { Heading, Lozenge, Text } from "@senvenli/react/display";
import { Breadcrumbs } from "@senvenli/react/navigation";
import type { ReactNode } from "react";
import { familyTitle, type Manifest } from "../lib/manifest";

/** A component's page, rendered from its manifest. `example` is the live demo, when the slug has one. */
export function ComponentPage({ manifest, example }: { manifest: Manifest; example?: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-ds-300 px-ds-300 py-ds-600">
      {/* The family is a breadcrumb level only: the URL stays /components/<slug>. */}
      <Breadcrumbs items={[{ label: "Components", href: "/components" }, { label: familyTitle(manifest.family) }, { label: manifest.title }]} />
      <div className="flex flex-col gap-ds-100">
        <div className="flex items-center gap-ds-150">
          <Heading level={1} size="heading-xlarge">
            {manifest.title}
          </Heading>
          <Lozenge>{manifest.status}</Lozenge>
        </div>
        <Text size="body-large">{manifest.description}</Text>
        <Text size="code">{`import { ${manifest.exports.join(", ")} } from "${manifest.import}";`}</Text>
        <div className="flex gap-ds-200">
          <a href={`/components/${manifest.name}.md`}>Markdown</a>
          <a href={`/components/${manifest.name}.json`}>JSON</a>
        </div>
      </div>

      {example && (
        <section aria-label="Example" data-slot="example" className="rounded-ds-large bg-ds-surface-raised p-ds-300">
          {example}
        </section>
      )}

      <section className="flex flex-col gap-ds-100">
        <Heading level={2} size="heading-medium">
          When to use
        </Heading>
        <ul className="m-0 ps-ds-250">
          {manifest.usage.when.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {Object.entries(manifest.props).map(([component, props]) => (
        <section key={component} className="flex flex-col gap-ds-100">
          <Heading level={2} size="heading-medium">
            {component} props
          </Heading>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-body-small">
              <thead>
                <tr>
                  <th className="py-ds-075 pe-ds-200 text-start font-medium">Prop</th>
                  <th className="py-ds-075 pe-ds-200 text-start font-medium">Type</th>
                  <th className="py-ds-075 text-start font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {props.map((prop) => (
                  <tr key={prop.name}>
                    <td className="py-ds-075 pe-ds-200 align-top font-mono">
                      {prop.name}
                      {prop.required ? " *" : ""}
                    </td>
                    <td className="py-ds-075 pe-ds-200 align-top font-mono text-ds-text-subtle">{prop.type}</td>
                    <td className="py-ds-075 align-top">{prop.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {!!manifest.related?.length && (
        <section className="flex flex-col gap-ds-100">
          <Heading level={2} size="heading-medium">
            Related
          </Heading>
          <div className="flex flex-wrap gap-ds-200">
            {manifest.related.map((slug) => (
              <Link key={slug} href={`/components/${slug}`}>
                {slug}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
