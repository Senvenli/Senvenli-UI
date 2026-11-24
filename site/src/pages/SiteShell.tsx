import { Link, ThemeSwitcher } from "@senvenli/react/action";
import { Link as AriaLink } from "react-aria-components";
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
        brand={
          // The Senvenli wordmark (as on senvenli.com): the mark, then the name in wide-tracked Sora.
          <span className="flex items-center gap-ds-150 text-ds-text">
            <span aria-hidden className="site-brand-mark" />
            <span className="site-brand-name">SENVENLI UI</span>
          </span>
        }
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
          <div className="grid gap-ds-600 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
            {/* The brand, as in the navbar, with one line on what the site is. */}
            <div className="flex flex-col gap-ds-150">
              <AriaLink href="/" aria-label="Senvenli UI home" className="flex w-fit items-center gap-ds-150 rounded-ds-small text-ds-text outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused">
                <span aria-hidden className="site-brand-mark" />
                <span aria-hidden className="site-brand-name">SENVENLI UI</span>
              </AriaLink>
              <div className="max-w-72">
                <Text size="body-small" tone="subtle">
                  Accessible React components that theme themselves, checked against WCAG AA.
                </Text>
              </div>
            </div>
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
          </div>
          <div className="flex flex-wrap items-center justify-between gap-ds-200 border-t border-ds-border pt-ds-300">
            <Text size="body-small" tone="subtle">
              MIT license. Made by{" "}
              <a
                href="https://senvenli.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-ds-xsmall text-ds-text-subtle no-underline decoration-1 underline-offset-3 outline-hidden hover:text-ds-text hover:underline focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused"
              >
                Senvenli
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </Text>
            {/* The same theme menu as the navbar's. */}
            <ThemeSwitcher variant="menu" />
          </div>
        </div>
      </footer>
    </div>
  );
}
