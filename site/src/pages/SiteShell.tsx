import { Link, ThemeSwitcher } from "@senvenli/react/action";
import { Navbar, SkipLink } from "@senvenli/react/navigation";
import type { ReactNode } from "react";
import { SiteSearch } from "../components/SiteSearch";
import type { ManifestIndexEntry } from "../lib/manifest";

const LINKS = [
  { key: "docs", label: "Docs", href: "/docs" },
  { key: "components", label: "Components", href: "/docs/components" },
  { key: "create", label: "Create", href: "/create" },
];

/**
 * The site chrome: the library's Navbar (sticky; a menu panel under 768px), a skip link, the theme switch and a quiet
 * footer. `section` is the first path segment ("components"), which marks the current top link. Router-agnostic:
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
        actions={
          <span className="flex items-center gap-ds-100">
            {onNavigate && <SiteSearch components={components} docs={docs} onNavigate={onNavigate} />}
            <ThemeSwitcher variant="menu" />
          </span>
        }
      />
      <div className="flex-1">{children}</div>
      <footer className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-ds-200 px-ds-200 py-ds-500 text-body-small text-ds-text-subtle sm:px-ds-300">
        <span>MIT license. Made by Senvenli.</span>
        <span className="flex gap-ds-300">
          <Link variant="subtle" href="/llms.txt">
            llms.txt
          </Link>
          <Link variant="subtle" href="/docs/components">
            Components
          </Link>
        </span>
      </footer>
    </div>
  );
}
