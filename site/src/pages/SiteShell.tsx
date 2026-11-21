import { Link, ThemeToggle } from "@senvenli/react/action";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create" },
  { href: "/components", label: "Components" },
  { href: "/docs/getting-started", label: "Docs" },
];

/** The site chrome. Router-agnostic: links are the library's, which the provider routes. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between gap-ds-300 px-ds-300">
        <nav aria-label="Main" className="flex items-center gap-ds-300">
          <span className="text-body-strong text-ds-text">Senvenli UI</span>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
