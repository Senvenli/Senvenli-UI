import { cn } from "@senvenli/react";
import { Icon } from "@senvenli/react/display";
import { useEffect, useId, useRef, useState } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
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

/** A family of components as a nested, collapsible group: its title is a button that shows or hides its rows. */
function Family({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  const id = useId();
  return (
    <li>
      <AriaButton aria-expanded={isOpen} aria-controls={id} onPress={onToggle} className={cn(ROW, "w-full justify-between font-medium text-ds-text")}>
        {title}
        <Icon name={isOpen ? "chevron-down" : "chevron-right"} size="small" color="subtle" />
      </AriaButton>
      <ul id={id} hidden={!isOpen} className="m-0 ms-ds-150 flex list-none flex-col gap-ds-025 border-s border-ds-border p-0 ps-ds-075">
        {children}
      </ul>
    </li>
  );
}

/**
 * The one sidebar of every page under /docs, as shadcn lays it out: "Sections" (the introduction, the component list
 * and every doc, in reading order), then the components. The current page is a filled row, scrolled into
 * view on arrival; the list scrolls on its own under the sticky header. Components are grouped by family, each a
 * collapsible group; the family of the page in view opens by itself.
 */
export function DocsSidebar() {
  const data = useSiteData();
  const path = data?.path ?? "";
  const currentFamily = data?.components.find((item) => path === `/docs/components/${item.name}`)?.family;
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentFamily ? [currentFamily] : []));
  // Moving to a component of a closed family opens it; the families opened by hand stay open.
  useEffect(() => {
    if (currentFamily) setOpen((now) => (now.has(currentFamily) ? now : new Set(now).add(currentFamily)));
  }, [currentFamily]);
  const toggle = (family: string) =>
    setOpen((now) => {
      const next = new Set(now);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
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
        <Group title="Components">
          {families.map((family) => (
            <Family key={family} title={familyTitle(family)} isOpen={open.has(family)} onToggle={() => toggle(family)}>
              {components
                .filter((item) => item.family === family)
                .map((item) => (
                  <Row key={item.name} href={`/docs/components/${item.name}`} current={path === `/docs/components/${item.name}`}>
                    {item.title}
                  </Row>
                ))}
            </Family>
          ))}
        </Group>
      </div>
    </nav>
  );
}
