import { cn } from "@senvenli/react";
import { useEffect, useRef } from "react";
import { Link as AriaLink } from "react-aria-components";
import { familyTitle, orderComponents } from "../lib/manifest";
import { useSiteData } from "../lib/site-data";

const ROW =
  "flex h-8 items-center rounded-ds-medium px-ds-150 text-body text-ds-text-subtle outline-hidden transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-text data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";
const CURRENT = "bg-ds-background-neutral font-medium text-ds-text data-[hovered]:bg-ds-background-neutral";

function Row({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <li>
      {/* React Aria's Link routes through the provider, as the library's links do, and takes the row's styles. */}
      <AriaLink href={href} aria-current={current ? "page" : undefined} className={cn(ROW, current && CURRENT)}>
        {children}
      </AriaLink>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-ds-050">
      <span className="px-ds-150 pb-ds-050 text-body-small font-medium text-ds-text-subtlest">{title}</span>
      <ul className="m-0 flex list-none flex-col gap-ds-025 p-0">{children}</ul>
    </div>
  );
}

/**
 * The one sidebar of every page under /docs: "Sections" (the introduction, the component list and every doc, in
 * reading order), then one labelled section per component family, every row visible (no accordion to open). The
 * current page is a filled row, scrolled into view on arrival; the list scrolls on its own under the sticky header.
 */
export function DocsSidebar() {
  const data = useSiteData();
  const path = data?.path ?? "";
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    // Only the list scrolls: scrollIntoView would move the page too.
    const nav = list.current;
    const row = nav?.querySelector<HTMLElement>("[aria-current='page']");
    if (!nav || !row) return;
    const offset = row.getBoundingClientRect().top - nav.getBoundingClientRect().top;
    if (offset < 0 || offset > nav.clientHeight - row.offsetHeight) nav.scrollTop += offset - nav.clientHeight / 2;
  }, [path]);
  if (!data) return null;
  const docs = data.docs.filter((doc) => doc.slug !== "introduction");
  const components = orderComponents(data.components);
  const families = [...new Set(components.map((item) => item.family))];
  return (
    <nav ref={list} aria-label="Docs" data-slot="docs-sidebar" className="h-full overflow-y-auto overscroll-contain py-ds-600 pe-ds-100">
      <div className="flex flex-col gap-ds-400">
        <Group title="Sections">
          <Row href="/docs" current={path === "/docs"}>
            Introduction
          </Row>
          <Row href="/docs/components" current={path === "/docs/components"}>
            Components
          </Row>
          {docs.map((doc) => (
            <Row key={doc.slug} href={`/docs/${doc.slug}`} current={path === `/docs/${doc.slug}`}>
              {doc.title}
            </Row>
          ))}
        </Group>
        {families.map((family) => (
          <Group key={family} title={familyTitle(family)}>
            {components
              .filter((item) => item.family === family)
              .map((item) => (
                <Row key={item.name} href={`/docs/components/${item.name}`} current={path === `/docs/components/${item.name}`}>
                  {item.title}
                </Row>
              ))}
          </Group>
        ))}
      </div>
    </nav>
  );
}
