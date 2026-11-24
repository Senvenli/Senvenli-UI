import { Button } from "@senvenli/react/action";
import { Icon, Kbd } from "@senvenli/react/display";
import { Pressable } from "@senvenli/react/action";
import { Command, type CommandGroup, type CommandItem } from "@senvenli/react/overlay";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ManifestIndexEntry } from "../lib/manifest";

const RECENT_KEY = "ds-site-recent";

function readRecent(): CommandItem[] {
  try {
    return (JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as CommandItem[]).slice(0, 5);
  } catch {
    return [];
  }
}

/** Opens the one search dialog, from any trigger; null outside SiteSearch (no search on the page). */
const SearchContext = createContext<{ open: () => void; mac: boolean } | null>(null);

/**
 * ⌘K search over the whole site: every component (found by title, family and description words), the docs and the
 * builder. The library's Command does the matching; the last five picks show while the query is empty.
 *
 * It wraps the whole shell and renders the one Command (and its one ⌘K handler) outside the navbar: the navbar's
 * actions also render inside the phone menu panel, which unmounts as it closes, and the dialog would close with it.
 * Triggers (SearchTrigger) only open it.
 */
export function SiteSearch({ components, docs = [], onNavigate, children }: { components: ManifestIndexEntry[]; docs?: { slug: string; title: string; description: string }[]; onNavigate: (href: string) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<CommandItem[]>([]);
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setRecent(readRecent());
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const groups = useMemo<CommandGroup[]>(
    () => [
      {
        id: "components",
        title: "Components",
        items: components.map((item) => ({
          id: `/docs/components/${item.name}`,
          label: item.title,
          kind: "page" as const,
          keywords: [item.family, ...item.description.toLowerCase().split(/\W+/).filter((word) => word.length > 3)],
        })),
      },
      {
        id: "docs",
        title: "Docs",
        items: docs.map((doc) => ({
          id: doc.slug === "introduction" ? "/docs" : `/docs/${doc.slug}`,
          label: doc.title,
          icon: "book-open" as const,
          kind: "page" as const,
          keywords: doc.description.toLowerCase().split(/\W+/).filter((word) => word.length > 3),
        })),
      },
      {
        id: "site",
        title: "Pages",
        items: [
          { id: "/create", label: "Create a theme", icon: "palette", kind: "action" as const, keywords: ["theme", "builder", "colors", "preset"] },
          { id: "/docs/components", label: "All components", icon: "layout-grid", kind: "page" as const },
          { id: "/llms.txt", label: "llms.txt for agents", icon: "bot", kind: "page" as const, keywords: ["ai", "agent", "markdown", "mcp"] },
        ],
      },
    ],
    [components, docs],
  );

  const select = (item: CommandItem) => {
    const next = [item, ...recent.filter((entry) => entry.id !== item.id)].slice(0, 5);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: recent picks last this page only.
    }
    setOpen(false);
    // llms.txt is a file, not a route: the browser opens it.
    if (item.id.endsWith(".txt")) window.location.assign(item.id);
    else onNavigate(item.id);
  };

  const context = useMemo(() => ({ open: () => setOpen(true), mac }), [mac]);
  return (
    <SearchContext.Provider value={context}>
      {children}
      <Command isOpen={open} onOpenChange={setOpen} groups={groups} recent={recent} onSelect={select} shortcut />
    </SearchContext.Provider>
  );
}

/**
 * The search box in the navbar: a field-like trigger from 768px (narrower until 1024px, so the links keep one line),
 * a labelled row in the phone menu. Renders nothing without SiteSearch around it.
 */
export function SearchTrigger() {
  const search = useContext(SearchContext);
  if (!search) return null;
  return (
    <>
      <div className="hidden md:block md:w-44 lg:w-64">
        <Pressable background="neutral" radius="medium" paddingInline="space-150" onPress={search.open} aria-keyshortcuts={search.mac ? "Meta+K" : "Control+K"}>
          <span className="flex h-8 items-center gap-ds-100 text-body text-ds-text-subtle">
            <Icon name="search" size="small" color="subtle" />
            <span className="flex-1 truncate">Search documentation…</span>
            <span aria-hidden className="hidden lg:inline">
              <Kbd>{search.mac ? "⌘K" : "Ctrl K"}</Kbd>
            </span>
          </span>
        </Pressable>
      </div>
      <span className="md:hidden">
        <Button variant="subtle" iconBefore="search" fullWidth onPress={search.open}>
          Search
        </Button>
      </span>
    </>
  );
}
