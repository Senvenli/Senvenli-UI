import { cn } from "@senvenli/react";
import { useEffect, useRef } from "react";
import { Link as AriaLink } from "react-aria-components";
import { familyTitle, type ManifestIndexEntry } from "../lib/manifest";

const ROW =
  "flex h-8 items-center rounded-ds-medium px-ds-150 text-body text-ds-text-subtle outline-hidden transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-text data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/**
 * The component list beside a page: one level of labelled groups (the families), 14px rows of 32px, the current
 * component as a filled row, scrolled into view on arrival. It scrolls on its own, under the sticky header.
 */
export function ComponentNav({ components, current }: { components: ManifestIndexEntry[]; current?: string }) {
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    // Only the list scrolls: scrollIntoView would move the page too.
    const nav = list.current;
    const row = nav?.querySelector<HTMLElement>("[aria-current='page']");
    if (!nav || !row) return;
    const offset = row.getBoundingClientRect().top - nav.getBoundingClientRect().top;
    if (offset < 0 || offset > nav.clientHeight - row.offsetHeight) nav.scrollTop += offset - nav.clientHeight / 2;
  }, [current]);
  const families = [...new Set(components.map((item) => item.family))];
  return (
    <nav ref={list} aria-label="Components" data-slot="component-nav" className="h-full overflow-y-auto overscroll-contain py-ds-600 pe-ds-100">
      <div className="flex flex-col gap-ds-400">
        {families.map((family) => (
          <div key={family} className="flex flex-col gap-ds-050">
            <span className="px-ds-150 pb-ds-050 text-body-small font-medium text-ds-text-subtlest">{familyTitle(family)}</span>
            <ul className="m-0 flex list-none flex-col gap-ds-025 p-0">
              {components
                .filter((item) => item.family === family)
                .map((item) => (
                  <li key={item.name}>
                    {/* React Aria's Link routes through the provider (as the library's links do) and takes the row's styles. */}
                    <AriaLink
                      href={`/components/${item.name}`}
                      aria-current={item.name === current ? "page" : undefined}
                      className={cn(ROW, item.name === current && "bg-ds-background-selected font-medium text-ds-text data-[hovered]:bg-ds-background-selected")}
                    >
                      {item.title}
                    </AriaLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
