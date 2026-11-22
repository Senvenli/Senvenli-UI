import { cn } from "@senvenli/react";
import { Link as AriaLink } from "react-aria-components";
import type { DocMeta } from "../lib/docs.server";

const ROW =
  "flex h-8 items-center rounded-ds-medium px-ds-150 text-body text-ds-text-subtle outline-hidden transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-text data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/** The docs beside a doc page: one level of groups, the current doc as a filled row, and a way to the components. */
export function DocsNav({ docs, current }: { docs: Pick<DocMeta, "slug" | "title" | "group">[]; current?: string }) {
  const groups = [...new Set(docs.map((doc) => doc.group))];
  return (
    <nav aria-label="Docs" data-slot="docs-nav" className="flex flex-col gap-ds-400 py-ds-600 pe-ds-100">
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-ds-050">
          <span className="px-ds-150 pb-ds-050 text-body-small font-medium text-ds-text-subtlest">{group}</span>
          <ul className="m-0 flex list-none flex-col gap-ds-025 p-0">
            {docs
              .filter((doc) => doc.group === group)
              .map((doc) => (
                <li key={doc.slug}>
                  <AriaLink
                    href={`/docs/${doc.slug}`}
                    aria-current={doc.slug === current ? "page" : undefined}
                    className={cn(ROW, doc.slug === current && "bg-ds-background-selected font-medium text-ds-text data-[hovered]:bg-ds-background-selected")}
                  >
                    {doc.title}
                  </AriaLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <div className="flex flex-col gap-ds-050">
        <span className="px-ds-150 pb-ds-050 text-body-small font-medium text-ds-text-subtlest">Reference</span>
        <AriaLink href="/components" className={ROW}>
          Components
        </AriaLink>
      </div>
    </nav>
  );
}
