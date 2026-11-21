import { Link } from "@senvenli/react/action";

export type PageSection = { id: string; title: string; children?: { id: string; title: string }[] };

/** The page's sections as in-page links beside the content on wide screens, with one level of children. */
export function OnThisPage({ sections }: { sections: PageSection[] }) {
  if (sections.length < 2) return null;
  return (
    <nav aria-label="On this page" data-slot="on-this-page" className="flex flex-col gap-ds-150">
      <span className="text-body-small font-medium text-ds-text">On this page</span>
      <ul className="m-0 flex list-none flex-col gap-ds-100 p-0 text-body-small">
        {sections.map((section) => (
          <li key={section.id} className="flex flex-col gap-ds-075">
            <Link variant="subtle" href={`#${section.id}`}>
              {section.title}
            </Link>
            {!!section.children?.length && (
              <ul className="m-0 flex list-none flex-col gap-ds-075 p-0 ps-ds-150">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <Link variant="subtle" href={`#${child.id}`}>
                      {child.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
