import { Link } from "@senvenli/react/action";

export type PageSection = { id: string; title: string };

/** The page's sections as in-page links, beside the content on wide screens. */
export function OnThisPage({ sections }: { sections: PageSection[] }) {
  if (sections.length < 2) return null;
  return (
    <nav aria-label="On this page" data-slot="on-this-page" className="flex flex-col gap-ds-100">
      <span className="text-body-small font-medium text-ds-text">On this page</span>
      <ul className="m-0 flex list-none flex-col gap-ds-075 p-0 text-body-small">
        {sections.map((section) => (
          <li key={section.id}>
            <Link variant="subtle" href={`#${section.id}`}>
              {section.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
