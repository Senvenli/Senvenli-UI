import { Link, ThemeSwitcher } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Navbar, SkipLink } from "@senvenli/react/navigation";
import type { ReactNode } from "react";
import { SiteSearch } from "../components/SiteSearch";
import type { ManifestIndexEntry } from "../lib/manifest";
import { SITE_CONTAINER, SITE_WIDTH } from "../lib/layout";

const LINKS = [
  { id: "docs", label: "Docs", href: "/docs" },
  { id: "components", label: "Components", href: "/docs/components" },
  { id: "create", label: "Theme builder", href: "/create" },
];

/** The footer's columns: where people go next from any page. */
const FOOTER: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Docs",
    links: [
      { label: "Introduction", href: "/docs/introduction" },
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "Theming", href: "/docs/theming" },
      { label: "Dark mode", href: "/docs/dark-mode" },
      { label: "Design rules", href: "/docs/design-rules" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "All components", href: "/docs/components" },
      { label: "Theme builder", href: "/create" },
      { label: "Native apps", href: "/docs/native-apps" },
    ],
  },
  {
    title: "Quality",
    links: [
      { label: "Accessibility", href: "/docs/accessibility" },
      { label: "Languages and RTL", href: "/docs/languages-and-rtl" },
    ],
  },
  {
    title: "For agents",
    links: [
      { label: "MCP server", href: "/docs/agents" },
      { label: "llms.txt", href: "/llms.txt" },
    ],
  },
];

/**
 * The site chrome: the library's Navbar (sticky; a menu panel under 768px; its content at the site's width), a skip
 * link, the theme switch and a footer with the site's sections. `section` is the first path segment ("components"), which marks the current top link. Router-agnostic:
 * links are the library's, which the provider routes.
 */
export function SiteShell({ children, section, components = [], docs = [], onNavigate }: {
  children: ReactNode;
  section?: string;
  /** Every component, for search; search is left out without `onNavigate`. */
  components?: ManifestIndexEntry[];
  /** Every doc, for search. */
  docs?: { slug: string; title: string; description: string }[];
  onNavigate?: (href: string) => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink target="#main" />
      <Navbar
        brand={<span className="text-body-large font-medium text-ds-text">Senvenli UI</span>}
        brandLabel="Senvenli UI home"
        links={LINKS}
        currentKey={section}
        isSticky
        maxWidth={SITE_WIDTH}
        actions={
          <span className="flex items-center gap-ds-100">
            {onNavigate && <SiteSearch components={components} docs={docs} onNavigate={onNavigate} />}
            <ThemeSwitcher variant="menu" />
          </span>
        }
      />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-ds-border">
        <div className={`${SITE_CONTAINER} flex flex-col gap-ds-600 py-ds-800`}>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-ds-300 gap-y-ds-500 md:grid-cols-4">
            {FOOTER.map((column) => (
              <div key={column.title} className="flex flex-col gap-ds-150">
                <Text size="body-small" weight="medium">
                  {column.title}
                </Text>
                <ul className="m-0 flex list-none flex-col gap-ds-100 p-0">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link variant="subtle" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-ds-200 border-t border-ds-border pt-ds-300">
            <Text size="body-small" tone="subtle">
              MIT license. Made by Senvenli.
            </Text>
            <ThemeSwitcher variant="segmented" />
          </div>
        </div>
      </footer>
    </div>
  );
}
