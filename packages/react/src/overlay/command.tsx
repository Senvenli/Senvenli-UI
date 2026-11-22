"use client";

import * as React from "react";
import {
  Autocomplete,
  Dialog as AriaDialog,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Modal,
  ModalOverlay,
  SearchField,
  useLocale,
} from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";
import { Kbd } from "../display/kbd";
import { Badge, type BadgeTone } from "../display/badge";
import { actionFailedLabel, commandHints, commandPaletteLabel, commandSearchLabel, frequentActionsLabel, loadingLabel, noMatchLabel, recentRecordsLabel } from "../i18n";
import { Highlight, matchesQuery } from "../selection/match";

export type CommandItem = {
  id: string;
  /** "Pro plan", "Create order". */
  label: string;
  /** Beside the label in mono: a code, an order number ("ORD-482"). */
  detail?: string;
  icon?: IconName;
  /** A record's status ("Available", success). */
  status?: { label: string; tone: BadgeTone };
  /** An action's shortcut ("N"). */
  shortcut?: string;
  /** Extra words it is found by (a customer's phone number, an old name). */
  keywords?: readonly string[];
  /** Records come first, then actions, then pages; "action" items fill the "most used" list. */
  kind?: "record" | "action" | "page";
};

export type CommandGroup = { id: string; title: string; items: readonly CommandItem[] };

export type CommandProps = {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Actions and pages, most used first; matched here, diacritic-insensitive. */
  groups: readonly CommandGroup[];
  /** Records found by the server (codes, order numbers, names, phones); shown before the groups. */
  search?: (query: string, signal: AbortSignal) => Promise<readonly CommandGroup[]>;
  /** Shown while the query is empty, above the five most used actions. */
  recent?: readonly CommandItem[];
  onSelect: (item: CommandItem) => void;
  /** Bind ⌘K / Ctrl K to open and close it. */
  shortcut?: boolean;
};

const SEARCH_DELAY = 150;

/** Records first, then actions, then pages; a group ranks by its highest kind; equal groups keep their order. */
function byKind(groups: readonly CommandGroup[]) {
  const order = { record: 0, action: 1, page: 2 } as const;
  const rank = (group: CommandGroup) => Math.min(...group.items.map((item) => order[item.kind ?? "action"]));
  return [...groups].sort((a, b) => rank(a) - rank(b));
}

/** The server's results for a query, debounced and cancelled when the query moves on. */
function useSearch(query: string, search: CommandProps["search"]) {
  const [state, setState] = React.useState<{ query: string; groups: readonly CommandGroup[]; loading: boolean; failed: boolean }>({
    query: "", groups: [], loading: false, failed: false,
  });
  React.useEffect(() => {
    if (!search || !query.trim()) {
      setState({ query, groups: [], loading: false, failed: false });
      return;
    }
    const controller = new AbortController();
    // The last answer stays (filtered by the caller) while the next one loads, so records do not flicker away.
    setState((current) => ({ ...current, loading: true, failed: false }));
    const timer = setTimeout(() => {
      search(query, controller.signal).then(
        (groups) => !controller.signal.aborted && setState({ query, groups, loading: false, failed: false }),
        () => !controller.signal.aborted && setState({ query, groups: [], loading: false, failed: true }),
      );
    }, SEARCH_DELAY);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, search]);
  return state;
}

/** A row's key: group and item, since ids repeat across groups (a product and an order both "12"). */
const rowKey = (group: CommandGroup, item: CommandItem) => `${group.id}\u0000${item.id}`;

function Row({ item, query, rowId }: { item: CommandItem; query: string; rowId: string }) {
  return (
    <ListBoxItem
      id={rowId}
      textValue={item.detail ? `${item.label} ${item.detail}` : item.label}
      data-slot="command-item"
      data-kind={item.kind}
      className="flex min-h-10 cursor-default items-center gap-ds-150 rounded-ds-medium px-ds-150 text-body text-ds-text outline-hidden data-[focused]:bg-ds-background-selected data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[focused]:data-[hovered]:bg-ds-background-selected"
    >
      {item.icon && <IconGlyph name={item.icon} size="small" data-slot="command-item-icon" className="text-ds-icon-subtle" />}
      <span data-slot="command-item-label" className="min-w-0 flex-1 truncate">
        <Highlight text={item.label} query={query} />
        {item.detail && (
          <>
            <span aria-hidden> · </span>
            <bdi data-slot="command-item-detail" className="font-ds-mono text-code text-ds-text-subtle">
              <Highlight text={item.detail} query={query} />
            </bdi>
          </>
        )}
      </span>
      {item.status && <Badge tone={item.status.tone}>{item.status.label}</Badge>}
      {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
    </ListBoxItem>
  );
}

/**
 * ⌘K / Ctrl K: find any record and run any action from the keyboard. 560px in the top third over the
 * blanket; one field, results grouped (records, then actions, then pages), 40px rows, the active row on
 * ds-background-selected, records with their status. Empty, it shows recent records and the five most used
 * actions. Typing matches labels, codes and keywords without regard to case or accents ("durovic" finds
 * "Đurović"), and asks `search` for records (the last answer stays while the next loads; a failed search says
 * so). Arrows move, Enter opens, Esc closes and returns focus. Rows are keyed by group and id, so ids may repeat
 * across groups. When records arrive after the actions, the active row stays where it was (React Aria's
 * Autocomplete keeps its virtual focus); arrows reach the records first in the list.
 * Everything here must also be reachable through visible UI.
 */
export function Command({ isOpen, defaultOpen, onOpenChange, groups, search, recent = [], onSelect, shortcut }: CommandProps) {
  const { locale } = useLocale();
  const [own, setOwn] = React.useState(defaultOpen ?? false);
  const open = isOpen ?? own;
  const setOpen = (next: boolean) => {
    if (isOpen === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const latest = React.useRef({ open, setOpen });
  latest.current = { open, setOpen };

  React.useEffect(() => {
    if (!shortcut) return;
    // ⌘K on Apple platforms (Ctrl K there is "delete to end of line" in every field), Ctrl K elsewhere. The
    // physical key counts too, for Cyrillic and Greek layouts; a key an editor already handled is left alone.
    const apple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.shiftKey) return;
      const modifier = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
      if (modifier && (event.key.toLowerCase() === "k" || event.code === "KeyK")) {
        event.preventDefault();
        latest.current.setOpen(!latest.current.open);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [shortcut]);

  const [query, setQuery] = React.useState("");
  // A new opening starts from an empty query.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setQuery("");
  }
  const remote = useSearch(query, search);
  const empty = !query.trim();

  const shown: CommandGroup[] = React.useMemo(() => {
    if (empty) {
      const actions = groups.flatMap((group) => group.items).filter((item) => (item.kind ?? "action") === "action").slice(0, 5);
      return [
        ...(recent.length ? [{ id: "__recent", title: recentRecordsLabel(locale), items: recent }] : []),
        ...(actions.length ? [{ id: "__frequent", title: frequentActionsLabel(locale), items: actions }] : []),
      ];
    }
    const local = groups
      .map((group) => ({ ...group, items: group.items.filter((item) => matchesQuery(query, item.label, item.detail, ...(item.keywords ?? []))) }))
      .filter((group) => group.items.length);
    // The newest answer, or the previous one (still matching the query) while the next one loads.
    const found = (remote.query === query ? remote.groups : remote.groups.map((group) => ({ ...group, items: group.items.filter((item) => matchesQuery(query, item.label, item.detail, ...(item.keywords ?? []))) })))
      .filter((group) => group.items.length);
    return byKind([...found, ...local]);
  }, [empty, groups, recent, locale, query, remote]);

  const items = React.useMemo(() => new Map(shown.flatMap((group) => group.items.map((item) => [rowKey(group, item), item] as const))), [shown]);
  const hints = commandHints(locale);

  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={setOpen}
      isDismissable
      data-slot="command-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-ds-blanket px-ds-200 pt-[15dvh] transition-opacity duration-(--ds-duration-medium) data-[entering]:opacity-0 data-[exiting]:opacity-0 motion-reduce:transition-none"
    >
      <Modal
        data-slot="command"
        className="flex max-h-[70dvh] w-full max-w-140 flex-col overflow-hidden rounded-ds-xlarge bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden"
      >
        <AriaDialog aria-label={commandPaletteLabel(locale)} data-slot="command-dialog" className="flex min-h-0 flex-1 flex-col outline-hidden">
          <div
            className="flex min-h-0 flex-1 flex-col"
            // Esc closes at once, as the footer says (the search field would otherwise clear itself first).
            onKeyDownCapture={(event) => {
              if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
              }
            }}
          >
          <Autocomplete inputValue={query} onInputChange={setQuery}>
            <SearchField aria-label={commandSearchLabel(locale)} autoFocus data-slot="command-search" className="flex min-h-13 items-center gap-ds-150 border-b border-ds-border px-ds-200">
              <IconGlyph name="search" className="size-5 shrink-0 text-ds-icon-subtle" />
              <Input
                placeholder={commandSearchLabel(locale)}
                data-slot="command-input"
                className="min-w-0 flex-1 bg-transparent text-body text-ds-text outline-hidden placeholder:text-ds-text-subtlest [&::-webkit-search-cancel-button]:hidden"
              />
              <Kbd>Esc</Kbd>
            </SearchField>
            <ListBox
              aria-label={commandPaletteLabel(locale)}
              data-slot="command-results"
              onAction={(key) => {
                const item = items.get(String(key));
                if (!item) return;
                setOpen(false);
                onSelect(item);
              }}
              renderEmptyState={() => (
                <div data-slot="command-empty" className="px-ds-200 py-ds-300 text-center text-body text-ds-text-subtle">
                  {remote.loading ? loadingLabel(locale) : remote.failed ? actionFailedLabel(locale) : empty ? null : noMatchLabel(locale, query.trim())}
                </div>
              )}
              className="min-h-0 flex-1 overflow-y-auto p-ds-100 outline-hidden"
            >
              {shown.map((group) => (
                <ListBoxSection key={group.id} id={group.id} data-slot="command-group" className="flex flex-col">
                  <Header data-slot="command-group-title" className="px-ds-150 pt-ds-150 pb-ds-050 text-heading-xxsmall text-ds-text-subtle">
                    {group.title}
                  </Header>
                  {group.items.map((item) => <Row key={rowKey(group, item)} rowId={rowKey(group, item)} item={item} query={empty ? "" : query} />)}
                </ListBoxSection>
              ))}
            </ListBox>
            <span aria-live="polite" className="sr-only" data-slot="command-status">
              {remote.loading ? loadingLabel(locale) : ""}
            </span>
          </Autocomplete>
          <div data-slot="command-footer" className="flex flex-wrap items-center gap-ds-300 border-t border-ds-border bg-ds-surface-sunken px-ds-200 py-ds-100 text-body-small text-ds-text-subtle">
            <span className="flex items-center gap-ds-050"><Kbd>↑</Kbd><Kbd>↓</Kbd>{hints.move}</span>
            <span className="flex items-center gap-ds-050"><Kbd>↵</Kbd>{hints.open}</span>
            <span className="flex items-center gap-ds-050"><Kbd>Esc</Kbd>{hints.close}</span>
          </div>
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
