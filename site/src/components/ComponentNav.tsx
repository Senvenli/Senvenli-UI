import { Link } from "@senvenli/react/action";
import { cn } from "@senvenli/react";
import { familyTitle, type ManifestIndexEntry } from "../lib/manifest";

/** The component list beside a page: every family with its components, the current one marked. */
export function ComponentNav({ components, current }: { components: ManifestIndexEntry[]; current?: string }) {
  const families = [...new Set(components.map((item) => item.family))];
  return (
    <nav aria-label="Components" data-slot="component-nav" className="flex flex-col gap-ds-300 pb-ds-600">
      {families.map((family) => (
        <div key={family} className="flex flex-col gap-ds-075">
          <span className="px-ds-150 text-body-small font-medium text-ds-text">{familyTitle(family)}</span>
          <ul className="m-0 flex list-none flex-col p-0">
            {components
              .filter((item) => item.family === family)
              .map((item) => (
                <li
                  key={item.name}
                  data-current={item.name === current || undefined}
                  className={cn(
                    "border-s-2 border-transparent px-ds-150 py-ds-025 text-body-small",
                    item.name === current && "border-ds-border-selected",
                  )}
                >
                  <Link variant="subtle" href={`/components/${item.name}`} aria-current={item.name === current ? "page" : undefined}>
                    {item.title}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
