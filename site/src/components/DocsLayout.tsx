import { Button } from "@senvenli/react/action";
import { Drawer } from "@senvenli/react/overlay";
import { useEffect, useState, type ReactNode } from "react";
import { DocsSidebar } from "./DocsSidebar";
import { SITE_CONTAINER } from "../lib/layout";
import { useSiteData } from "../lib/site-data";

/**
 * Under 1024px the sidebar is not on the page: a "Browse docs" button opens it in a drawer from the start edge, so
 * every doc and component stays one tap away on phones and tablets. A pick closes the drawer (the path changes).
 */
function DocsDrawer() {
  const [open, setOpen] = useState(false);
  const path = useSiteData()?.path;
  useEffect(() => setOpen(false), [path]);
  return (
    <div className={`${SITE_CONTAINER} pt-ds-300 lg:hidden`} data-slot="docs-browse">
      <Button size="small" iconBefore="panel-left-open" onPress={() => setOpen(true)}>
        Browse docs
      </Button>
      <Drawer title="Docs" position="start" size="small" isOpen={open} onOpenChange={setOpen}>
        <DocsSidebar />
      </Drawer>
    </div>
  );
}

/**
 * Every page under /docs: the sidebar from 1024px (a drawer under it), the page, and from 1280px a right column ("On
 * this page"). Without `aside` the page takes the right column's room too (the component list).
 */
export function DocsLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <>
      <DocsDrawer />
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
    </>
  );
}
