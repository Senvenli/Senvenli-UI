import type { ReactNode } from "react";
import { DocsSidebar } from "./DocsSidebar";
import { SITE_CONTAINER } from "../lib/layout";

/**
 * Every page under /docs: the sidebar from 1024px, the page, and from 1280px a right column ("On this page"). Without
 * `aside` the page takes the right column's room too (the component list).
 */
export function DocsLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div
      className={
        `${SITE_CONTAINER} grid gap-ds-600 lg:grid-cols-[15rem_minmax(0,1fr)] ` +
        (aside ? "xl:grid-cols-[15rem_minmax(0,47.5rem)_12.5rem] xl:justify-between" : "")
      }
    >
      <aside className="hidden lg:block">
        <div className="sticky top-14 h-[calc(100dvh-3.5rem)]">
          <DocsSidebar />
        </div>
      </aside>
      {children}
      {aside && (
        <aside className="hidden xl:block">
          <div className="sticky top-14 pt-ds-600">{aside}</div>
        </aside>
      )}
    </div>
  );
}
