import { Button } from "@senvenli/react/action";
import { Kbd } from "@senvenli/react/display";
import { CommandPalette, type CommandGroup, type CommandItem } from "@senvenli/react/overlay";
import { useEffect, useMemo, useState } from "react";
import { familyTitle, type ManifestIndexEntry } from "../lib/manifest";

const RECENT_KEY = "ds-site-recent";

function readRecent(): CommandItem[] {
  try {
    return (JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as CommandItem[]).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * ⌘K search over the whole site: every component (found by title, family and description words), the docs and the
 * builder. The library's CommandPalette does the matching; the last five picks show while the query is empty.
 */
export function SiteSearch({ components, onNavigate }: { components: ManifestIndexEntry[]; onNavigate: (href: string) => void }) {
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
          id: `/components/${item.name}`,
          label: item.title,
          detail: familyTitle(item.family),
          kind: "page" as const,
          keywords: [item.family, ...item.description.toLowerCase().split(/\W+/).filter((word) => word.length > 3)],
        })),
      },
      {
        id: "site",
        title: "Pages",
        items: [
          { id: "/create", label: "Create a theme", icon: "palette", kind: "action" as const, keywords: ["theme", "builder", "colors", "preset"] },
          { id: "/docs/getting-started", label: "Getting started", icon: "book-open", kind: "page" as const, keywords: ["install", "setup", "docs"] },
          { id: "/components", label: "All components", icon: "layout-grid", kind: "page" as const },
          { id: "/llms.txt", label: "llms.txt for agents", icon: "bot", kind: "page" as const, keywords: ["ai", "agent", "markdown", "mcp"] },
        ],
      },
    ],
    [components],
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

  return (
    <>
      <Button variant="subtle" iconBefore="search" onPress={() => setOpen(true)} aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}>
        <span className="flex items-center gap-ds-150">
          Search
          <span className="hidden sm:inline-flex" aria-hidden>
            <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd>
          </span>
        </span>
      </Button>
      <CommandPalette isOpen={open} onOpenChange={setOpen} groups={groups} recent={recent} onSelect={select} shortcut />
    </>
  );
}
