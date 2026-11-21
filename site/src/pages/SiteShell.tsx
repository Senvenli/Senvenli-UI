import { Link, ThemeToggle } from "@senvenli/react/action";
import { Navbar, SkipLink } from "@senvenli/react/navigation";
import type { ReactNode } from "react";

const LINKS = [
  { key: "components", label: "Components", href: "/components" },
  { key: "create", label: "Create", href: "/create" },
  { key: "docs", label: "Docs", href: "/docs/getting-started" },
];

/**
 * The site chrome: the library's Navbar (sticky; a menu panel under 768px), a skip link, the theme switch and a quiet
 * footer. `section` is the first path segment ("components"), which marks the current top link. Router-agnostic:
 * links are the library's, which the provider routes.
 */
export function SiteShell({ children, section }: { children: ReactNode; section?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink target="#main" />
      <Navbar
        brand={<span className="text-body-large font-medium text-ds-text">Senvenli UI</span>}
        brandLabel="Senvenli UI home"
        links={LINKS}
        currentKey={section}
        isSticky
        endActions={<ThemeToggle />}
      />
      <div className="flex-1">{children}</div>
      <footer className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-ds-200 px-ds-200 py-ds-500 text-body-small text-ds-text-subtle sm:px-ds-300">
        <span>MIT license. Made by Senvenli.</span>
        <span className="flex gap-ds-300">
          <Link variant="subtle" href="/llms.txt">
            llms.txt
          </Link>
          <Link variant="subtle" href="/components">
            Components
          </Link>
        </span>
      </footer>
    </div>
  );
}
