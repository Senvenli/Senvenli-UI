import { Button } from "@senvenli/react/action";
import { Icon, Kbd } from "@senvenli/react/display";
import { Pressable } from "@senvenli/react/layout";
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
export function SiteSearch({ components, docs = [], onNavigate }: { components: ManifestIndexEntry[]; docs?: { slug: string; title: string; description: string }[]; onNavigate: (href: string) => void }) {
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
          detail: familyTitle(item.family),
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

  return (
    <>
      {/* A field-like trigger, as wide as a search box and filled so it reads as one; an icon button on phones. */}
      <div className="hidden w-64 md:block">
        <Pressable background="neutral" radius="medium" paddingInline="space-150" onPress={() => setOpen(true)} aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}>
          <span className="flex h-8 items-center gap-ds-100 text-body text-ds-text-subtle">
            <Icon name="search" size="small" color="subtle" />
            <span className="flex-1 truncate">Search documentation…</span>
            <span aria-hidden>
              <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd>
            </span>
          </span>
        </Pressable>
      </div>
      <span className="md:hidden">
        <Button variant="subtle" iconOnly iconBefore="search" aria-label="Search" onPress={() => setOpen(true)} />
      </span>
      <CommandPalette isOpen={open} onOpenChange={setOpen} groups={groups} recent={recent} onSelect={select} shortcut />
    </>
  );
}
