"use client";

import * as React from "react";
import {
  Button,
  ButtonContext,
  Collection,
  ComboBox as AriaComboBox,
  ComboBoxStateContext,
  Group,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxLoadMoreItem,
  Popover,
  Text,
  useAsyncList,
  useLocale,
  type Key,
} from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph } from "../display/icon";
import { ControlFieldError, FieldDescription, FieldLabel, forwardedInvalid, useErrorRowLink, useFieldName } from "../form/field-parts";
import { FIELD_FRAME, FIELD_ICON, FIELD_SIZE, FIELD_STACK, INLINE_ACTION, INPUT, type FieldSize } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { createItemLabel, loadingLabel, noMatchLabel, removeItemLabel, showSuggestionsLabel } from "../i18n";
import { hasContent } from "./choice-text";
import { ITEM_ICON, LISTBOX, OPTION, POPOVER } from "./listbox";
import { Highlight, matchesQuery } from "./match";
import { TAG, TAG_REMOVE } from "./multi-select";
import type { SelectLabelProps } from "./select";

export type ComboBoxItem = {
  id: Key;
  label: string;
  /** Secondary line (an ID, e-mail); searched like the label. */
  description?: string;
  /** A trailing mark such as a status Lozenge. */
  badge?: React.ReactNode;
  /**
   * A small decorative mark before the label (a country's `IsoChip`, the app's own node): in the option row,
   * before the chosen label in the field and in a multiple selection's tags. Hidden from assistive technology;
   * the label alone names the option. Left out, the DOM is as before.
   */
  icon?: React.ReactNode;
  /** Shown but skipped by the keyboard and not selectable. */
  isDisabled?: boolean;
};

/**
 * Server search: called with the typed text and, for the next page, the
 * cursor the previous page returned. `signal` aborts superseded requests.
 */
export type ComboBoxLoader = (
  filterText: string,
  cursor: string | undefined,
  signal: AbortSignal,
) => Promise<{ items: ComboBoxItem[]; cursor?: string }>;

type BaseProps = {
  /** The whole list, filtered here as the user types. */
  items?: readonly ComboBoxItem[];
  /** Or load matches from the server (with paging when it returns a cursor). */
  loadItems?: ComboBoxLoader;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  placeholder?: string;
  isRequired?: boolean;
  /**
   * Who says an empty required ComboBox is missing: `field` (default) shows "Fill in this field."
   * on blur and on a DS Form submit, which it then blocks; `app` only marks the field. Empty is no chosen item
   * (multiple: no tag); with `allowsCustomValue`, typed text counts as a value. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  isInvalid?: boolean;
  name?: string;
  /** `input` (default) opens on typing; `focus` also on focus. The chevron always opens the full list. */
  menuTrigger?: "input" | "focus";
  /** The empty result; defaults to "No results for “{query}”." in the provider locale. */
  emptyMessage?: (query: string) => React.ReactNode;
  /** Adds a create row for the typed text when nothing matches it exactly. */
  onCreate?: (text: string) => void;
  /** The create row's text; defaults to "Add “{query}”". */
  createLabel?: (text: string) => string;
  /** The typed text, for consumers that need it (custom values, analytics). */
  onInputChange?: (text: string) => void;
  size?: FieldSize;
  /**
   * The app is fetching items itself (with `items`, not `loadItems`): a spinner
   * shows in the field and at the end of the list, and the change is announced.
   * Items already shown stay selectable by keyboard and pointer. Together with
   * `loadItems`, the field's own loading status is the one announced, so there
   * is a single status region.
   */
  isLoading?: boolean;
  /** What is announced and shown while loading; defaults to "Loading…" in the provider locale. */
  loadingText?: string;
  /**
   * The app searches on the server itself (with `items`, not `loadItems`;): told the text to search for,
   * the typed text, or `""` when the list opens in full (the chevron, focus with `menuTrigger="focus"`) or the field
   * just shows the chosen item's label. Debounce it on the app side. With it, `items` are the app's results and are
   * shown as given, not filtered again here; the match in each row is still in bold. Not called on mount.
   *
   * The field hides rows found for another text itself: from the moment the text changes until the app's answer
   * arrives, the list shows its loading row, the field its spinner, and the loading is announced politely, whatever the
   * app does while it debounces. The answer has arrived when the rows change (ids, labels, second lines), when
   * `isLoading` is set and cleared again (also for a server that finds the same rows), or, if neither, once the same
   * rows have stood for a second with no new render. Nothing is asked of the app for it; `isLoading` is still the way to
   * say a fetch is running.
   *
   * It is for a search that answers later. Filtering the rows the app already holds, synchronously, is the local filter's
   * job (pass `items` without `onSearchChange`): here an answer with the very same rows and no `isLoading` stays hidden
   * for that second. The field tells answers apart by when they arrive, not by the text they were asked for: an earlier
   * request that answers after the next keystroke counts as the answer to the newer text. Abort superseded requests, or
   * keep each answer under its own text (react-query's query key, without `placeholderData`).
   */
  onSearchChange?: (search: string) => void;
  /**
   * The next page of the app's own `items`, for an app that pages with its own query (react-query's
   * infinite query): called when the list is scrolled near its end. Pass it only while there is another page
   * (`hasNextPage ? fetchNextPage : undefined`), and set `isLoading` while the page loads: the list then ends in a
   * loading row, the field shows its spinner and the loading is announced (politely). It is not called again while
   * `isLoading` is set, nor twice before the app answers (a new page, `isLoading`, or a new search). The app's error
   * stays the app's (`errorMessage`, `description`); after it, a scroll to the end asks again. With `loadItems`, which
   * pages by itself, it is not used.
   */
  onLoadMore?: () => void;
  /**
   * The input's id, so a label outside the component (`<label htmlFor={id}>`, an app's form field) names it.
   * With neither `label` nor `aria-label`, that external label is the field's name and no label of its own
   * renders.
   */
  id?: string;
  /** Ids of text outside the component that describes the input (an app's hint or error), added to its own. */
  "aria-describedby"?: string;
  /**
   * Set by a form row that owns the error text (the shared `Field` hands its control `aria-invalid`): the field
   * shows its invalid state as with `isInvalid`, and without an `errorMessage` of its own draws no error row,
   * so the row's message is the only one. It marks the input for assistive tech and draws it
   * invalid only: unlike `isInvalid` it never becomes the input's native validity (React Aria's default outside a
   * DS Form), so it never blocks a form's submit.
   */
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * How the field is named: Select's visible `label` or `aria-label` (SelectLabelProps), or, for a form that
 * renders its own label, neither of them and an `id` that the external `<label htmlFor>` points at.
 */
type ComboBoxLabelProps =
  | SelectLabelProps
  | {
      label?: never;
      "aria-label"?: never;
      /** The id an external `<label htmlFor>` points at; that label names the field. */
      id: string;
    };

/**
 * Either a visible `label` above the field or, where the context already names it (a toolbar filter next
 * to its heading, a table cell), an `aria-label` instead.
 */
export type ComboBoxSingleProps = ComboBoxLabelProps & BaseProps & {
  selectionMode?: "single";
  /** Controlled; may start undefined and become set later (never flips control). */
  selectedKey?: Key | null;
  defaultSelectedKey?: Key | null;
  onSelectionChange?: (key: Key | null) => void;
  /** The chosen item when it is not on the loaded page (server search), so its label still shows. */
  selectedItem?: ComboBoxItem;
  /**
   * Typed text that matches no item is kept as the field's text; the key
   * becomes `null` and `onInputChange` reports the text.
   */
  allowsCustomValue?: boolean;
};

export type ComboBoxMultipleProps = ComboBoxLabelProps & BaseProps & {
  selectionMode: "multiple";
  selectedKeys?: readonly Key[];
  defaultSelectedKeys?: readonly Key[];
  onSelectionChange?: (keys: Key[]) => void;
  /** Chosen items that are not on the loaded page, so their tags show their labels. */
  selectedItems?: readonly ComboBoxItem[];
};

export type ComboBoxProps = ComboBoxSingleProps | ComboBoxMultipleProps;

const CREATE_KEY = "__ds-combobox-create__";

/** A plain button inside the ComboBox: React Aria would otherwise wire every Button in it as the trigger. */
function OwnButton(props: React.ComponentProps<typeof Button>) {
  return (
    <ButtonContext.Provider value={null}>
      <Button {...props} />
    </ButtonContext.Provider>
  );
}

/** Exposes React Aria's combobox state to handlers outside its render tree (closing after a create). */
function StateBridge({ into }: { into: React.MutableRefObject<{ close: () => void } | null> }) {
  const state = React.useContext(ComboBoxStateContext);
  into.current = state;
  return null;
}

const SPIN =
  "size-ds-icon animate-spin rounded-ds-full border-2 border-current border-e-transparent text-ds-icon-subtle motion-reduce:animate-none";

/** The 16px spinner used while results load (the Spinner component's look). */
export function FieldSpinner() {
  const { locale } = useLocale();
  return (
    <span role="status" data-slot="field-spinner" className="grid size-6 shrink-0 place-items-center">
      <span aria-hidden="true" className={SPIN} />
      <span className="sr-only">{loadingLabel(locale)}</span>
    </span>
  );
}

/**
 * `isLoading` given (true or false): a live region that stays mounted, so
 * each start of loading is announced, plus a decorative spinner in the field.
 * Omitted, nothing renders. `announce` is off with `loadItems`, whose own
 * field spinner is already the status region.
 */
function LoadingState({ isLoading, text, spinner, announce }: { isLoading: boolean | undefined; text: string; spinner: boolean; announce: boolean }) {
  // Mounted empty and filled after mount: a live region born with its text is usually not read, so a field
  // that mounts already loading would go unannounced (the BulkBar count does the same).
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => setSpoken(isLoading ? text : ""), [isLoading, text]);
  if (isLoading === undefined) return null;
  return (
    <>
      {isLoading && spinner && (
        <span aria-hidden="true" data-slot="combobox-loading-spinner" className="grid size-6 shrink-0 place-items-center">
          <span className={SPIN} />
        </span>
      )}
      {announce && (
        <span role="status" data-slot="combobox-loading-status" className="sr-only">
          {spoken}
        </span>
      )}
    </>
  );
}

/**
 * Items for the current query: filtered here, or the latest page from the
 * server. While a server search for new text is in flight the old rows are
 * hidden, so a nonsense search never shows leftovers.
 */
function useSource(items: readonly ComboBoxItem[] | undefined, loadItems: ComboBoxLoader | undefined, query: string, appSearch = false) {
  const seen = React.useRef(new Map<Key, ComboBoxItem>());
  const next = React.useRef<string | undefined>(undefined);
  const remote = useAsyncList<ComboBoxItem, string>({
    async load({ signal, cursor, filterText }) {
      if (!loadItems) return { items: [] };
      try {
        const page = await loadItems(filterText ?? "", cursor, signal);
        // A superseded request never overwrites the cursor of the current one.
        if (!signal.aborted) next.current = page.cursor;
        return { items: page.items, cursor: page.cursor };
      } catch (error) {
        if (!signal.aborted) next.current = undefined;
        throw error;
      }
    },
  });
  React.useEffect(() => {
    if (loadItems && remote.filterText !== query) remote.setFilterText(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  for (const item of items ?? []) seen.current.set(item.id, item);
  for (const item of remote.items) seen.current.set(item.id, item);
  const loading = Boolean(loadItems) && (remote.loadingState === "loading" || remote.loadingState === "filtering");
  // The app's own server search (`onSearchChange`) answers with its results: they are shown as given.
  const list = loadItems
    ? (loading ? [] : remote.items)
    : appSearch
      ? [...(items ?? [])]
      : (items ?? []).filter((item) => matchesQuery(query, item.label, item.description));
  return {
    list,
    loading,
    loadingMore: remote.loadingState === "loadingMore",
    hasMore: Boolean(loadItems) && Boolean(next.current) && !loading && remote.loadingState !== "error",
    loadMore: () => remote.loadMore(),
    remember: (extra: readonly (ComboBoxItem | undefined)[]) => extra.forEach((item) => item && seen.current.set(item.id, item)),
    find: (key: Key | null | undefined) => (key === null || key === undefined ? undefined : seen.current.get(key)),
  };
}

/** Tells the app's server search (`onSearchChange`) when the text to search for changes; never on mount. */
function useSearchReport(search: string, onSearchChange: ((search: string) => void) | undefined) {
  const reported = React.useRef(search);
  const latest = React.useRef(onSearchChange);
  latest.current = onSearchChange;
  React.useEffect(() => {
    if (reported.current === search) return;
    reported.current = search;
    latest.current?.(search);
  }, [search]);
}

/** How long the same rows must stand, with no loading said, before they count as the answer to a new search. */
export const APP_RESULTS_QUIET_MS = 1000;

/** The rows as the app's search answers them: what they say and in what order, not the array they come in. */
function resultsSignature(items: readonly ComboBoxItem[] | undefined) {
  return (items ?? [])
    .map((item) => [typeof item.id, String(item.id), item.label, item.description ?? "", item.isDisabled ? "1" : ""].join("\u0000"))
    .join("\u0001");
}

/**
 * Whether the app's server search (`onSearchChange`) has answered the current text yet. The rows the
 * app holds were found for the previous text, so from the render the text changes in (typing, clearing it, the chevron's
 * full list, the chosen label) they are hidden until the app's answer arrives, and the loading row and status show
 * instead, so a debounce or a slow server does not show the previous text's rows. The field cannot tell which text an
 * answer was asked for: an out-of-order earlier response that arrives after the next keystroke still counts as the
 * answer, so apps should abort superseded requests. The answer has arrived when, after the change:
 * - the rows differ from the hidden ones (their ids, labels, second lines or disabled state; a new array holding the
 *   same rows does not count, as an app that derives `items` in render hands a new one on every render, also the
 *   one in which it stores the text it was told);
 * - or `isLoading` was set and is cleared again (the app's fetch finished, also when it found the same rows);
 * - or, with neither, the same rows stand for {@link APP_RESULTS_QUIET_MS} with nothing re-rendered and no loading said:
 *   a server that answered with the very same rows is shown then, never left hidden.
 * Only for the app's own search: with `loadItems` or the local filter it is never on. Synchronous filtering belongs to
 * the local filter, not `onSearchChange`: an answer with the same rows and no `isLoading` stays hidden for the quiet time.
 */
function useAppResults(enabled: boolean, search: string, items: readonly ComboBoxItem[] | undefined, isLoading: boolean) {
  const signature = enabled ? resultsSignature(items) : "";
  const reported = React.useRef(search);
  const waiting = React.useRef<{ signature: string; sawLoading: boolean } | null>(null);
  if (search !== reported.current) {
    reported.current = search;
    waiting.current = enabled ? { signature, sawLoading: false } : null;
  }
  if (!enabled) waiting.current = null;
  if (waiting.current) {
    if (isLoading) waiting.current.sawLoading = true;
    else if (waiting.current.sawLoading || signature !== waiting.current.signature) waiting.current = null;
  }
  const awaiting = waiting.current !== null;
  const [, settle] = React.useReducer((count: number) => count + 1, 0);
  React.useEffect(() => {
    if (!awaiting || isLoading) return;
    const timer = setTimeout(() => {
      waiting.current = null;
      settle();
    }, APP_RESULTS_QUIET_MS);
    return () => clearTimeout(timer);
  }, [awaiting, isLoading, items, search]);
  return awaiting;
}

/**
 * The app's `onLoadMore`, asked at most once per answer. React Aria's end-of-list sentinel fires again
 * whenever the collection changes, even while a page is on its way, so a request stays open until the app answers:
 * a page arrives (the item count changes), `isLoading` comes or goes, or the search changes. Never while loading.
 */
function useLoadMore(onLoadMore: (() => void) | undefined, isLoading: boolean, count: number, search: string) {
  const asked = React.useRef(false);
  const latest = React.useRef(onLoadMore);
  latest.current = onLoadMore;
  const loading = React.useRef(isLoading);
  loading.current = isLoading;
  React.useEffect(() => {
    asked.current = false;
  }, [isLoading, count, search]);
  const loadMore = React.useCallback(() => {
    if (loading.current || asked.current || !latest.current) return;
    asked.current = true;
    latest.current();
  }, []);
  return onLoadMore ? loadMore : undefined;
}

function Option({ item, query, single }: { item: ComboBoxItem; query: string; single: boolean }) {
  const create = item.id === CREATE_KEY;
  return (
    <ListBoxItem
      id={item.id}
      textValue={item.label}
      isDisabled={item.isDisabled}
      data-slot={create ? "combobox-create" : "combobox-option"}
      className={cn(OPTION, create && "mt-ds-050 border-t border-ds-border")}
    >
      {({ isSelected }) => (
        <>
          {create && <IconGlyph name="plus" data-slot="combobox-create-icon" />}
          {!create && hasContent(item.icon) && (
            <span aria-hidden="true" data-slot="combobox-option-icon" className={ITEM_ICON}>{item.icon}</span>
          )}
          <span className="flex min-w-0 flex-1 flex-col py-ds-075">
            {/* Label and description slots: the option is named by its label and described by the second line. */}
            <Text slot="label" data-slot="combobox-option-label" className="truncate">
              {create ? item.label : <Highlight text={item.label} query={query} />}
            </Text>
            {item.description && (
              <Text slot="description" data-slot="combobox-option-description" className="truncate text-body-small text-ds-text-subtlest">
                <Highlight text={item.description} query={query} />
              </Text>
            )}
          </span>
          {item.badge !== undefined && <span data-slot="combobox-option-badge" className="shrink-0">{item.badge}</span>}
          {single && isSelected && !create && <IconGlyph name="check" color="brand" data-slot="combobox-option-check" />}
        </>
      )}
    </ListBoxItem>
  );
}

function OptionList({
  shown, query, single, hasMore, loadingMore, loadMore, loading, empty, isLoading, loadingText, appLoadMore,
}: {
  shown: ComboBoxItem[];
  query: string;
  single: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  loading: boolean;
  empty: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  /** The app's own paging (`onLoadMore`, guarded); left out, the list ends as before. */
  appLoadMore?: () => void;
}) {
  const { locale } = useLocale();
  // A list with item icons (a country picker) never grows past the viewport (React Aria's 12px edge padding each
  // side): a long name truncates beside its chip at 320px. Without icons the popover is as before.
  const capped = shown.some((item) => hasContent(item.icon));
  return (
    <Popover data-slot="combobox-popover" placement="bottom start" offset={4} className={capped ? cn(POPOVER, "max-w-[calc(100vw-1.5rem)]") : POPOVER}>
      <ListBox
        data-slot="combobox-listbox"
        className={LISTBOX}
        renderEmptyState={() => (
          <div data-slot="combobox-empty" className="px-ds-100 py-ds-150 text-body-small text-ds-text-subtlest">
            {loading || isLoading ? (loadingText ?? loadingLabel(locale)) : empty}
          </div>
        )}
      >
        {/* Rows re-render when the query changes, so the bold match follows the typing. */}
        <Collection items={shown} dependencies={[query, single]}>
          {(item) => <Option item={item} query={query} single={single} />}
        </Collection>
        {hasMore && (
          <ListBoxLoadMoreItem onLoadMore={loadMore} isLoading={loadingMore} data-slot="combobox-load-more" className="flex justify-center py-ds-050">
            <FieldSpinner />
          </ListBoxLoadMoreItem>
        )}
        {/* The app's paging: the end-of-list sentinel asks for the next page; while it loads, the
            same loader row as below. An empty list has nothing to scroll and shows its loading text instead. */}
        {appLoadMore && !hasMore && shown.length > 0 && (
          <ListBoxLoadMoreItem
            onLoadMore={appLoadMore}
            isLoading={Boolean(isLoading)}
            data-slot="combobox-loading"
            className="flex items-center justify-center gap-ds-075 py-ds-075 text-body-small text-ds-text-subtlest"
          >
            <span aria-hidden="true" className={SPIN} />
            <span>{loadingText ?? loadingLabel(locale)}</span>
          </ListBoxLoadMoreItem>
        )}
        {/* A loader row, not an option: arrows and Enter skip it and keep working on the rows above. */}
        {isLoading && !hasMore && !appLoadMore && shown.length > 0 && (
          <ListBoxLoadMoreItem
            isLoading
            data-slot="combobox-loading"
            className="flex items-center justify-center gap-ds-075 py-ds-075 text-body-small text-ds-text-subtlest"
          >
            <span aria-hidden="true" className={SPIN} />
            <span>{loadingText ?? loadingLabel(locale)}</span>
          </ListBoxLoadMoreItem>
        )}
      </ListBox>
    </Popover>
  );
}

/** Opening by the chevron (or by focus) shows the full list; typing filters it again. */
function useShowAll() {
  const [showAll, setShowAll] = React.useState(false);
  return {
    showAll,
    // Closing keeps the flag, so closing never starts a new search; typing clears it.
    onOpenChange: (open: boolean, trigger?: "focus" | "input" | "manual") => {
      if (open) setShowAll(trigger === "manual" || trigger === "focus");
    },
    onType: () => setShowAll(false),
  };
}

/**
 * One item (or several) from a long list by typing to filter: products,
 * customers, countries, locations. Matching is anywhere in the label and the
 * secondary line, case- and diacritic-insensitive, with the match in bold.
 * A visible `label`, or an `aria-label` where the context already names the
 * field; an empty `aria-label` counts as none. In a form that
 * renders its own label, give neither and pass `id` for its `<label htmlFor>`;
 * `aria-describedby` adds the form's hint or error.
 */
export function ComboBox(props: ComboBoxProps) {
  return props.selectionMode === "multiple" ? <MultipleComboBox {...props} /> : <SingleComboBox {...props} />;
}

function SingleComboBox({
  label, "aria-label": ariaLabel, items, loadItems, description, errorMessage: errorMessageProp, placeholder, menuTrigger = "input", emptyMessage, allowsCustomValue,
  onCreate, createLabel, onInputChange, size = "medium", selectedKey, defaultSelectedKey, onSelectionChange, selectedItem,
  isLoading, loadingText, "aria-invalid": ariaInvalid, onSearchChange, onLoadMore, requiredValidation, isInvalid: isInvalidProp, ...rest
}: ComboBoxSingleProps) {
  const { locale } = useLocale();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { named, showLabel, externalNameProps } = useFieldName("ComboBox", label, ariaLabel, (rest as { "aria-labelledby"?: string })["aria-labelledby"], rest.id, inputRef);
  const [own, setOwn] = React.useState<Key | null>(selectedKey ?? defaultSelectedKey ?? null);
  if (selectedKey !== undefined && selectedKey !== own) setOwn(selectedKey);
  const value = selectedKey !== undefined ? selectedKey : own;
  const [input, setInputState] = React.useState("");
  // React Aria reports the new text and then the selection in one event; read the latest text, not the render's.
  const latestInput = React.useRef(input);
  const setInput = (text: string) => {
    latestInput.current = text;
    setInputState(text);
    onInputChange?.(text);
  };
  const { showAll, onOpenChange, onType } = useShowAll();
  const query = showAll ? "" : input;
  const appSearch = Boolean(onSearchChange) && !loadItems;
  const source = useSource(items, loadItems, query, appSearch);
  source.remember([selectedItem]);
  const current = source.find(value);
  const state = React.useRef<{ close: () => void } | null>(null);
  // The app's server search is for typed text: the chosen item's label shown in the field is not a search.
  const search = current && input === current.label ? "" : query;
  useSearchReport(search, appSearch ? onSearchChange : undefined);
  const awaiting = useAppResults(appSearch, search, items, Boolean(isLoading));
  // React Aria never finds an empty ComboBox missing under `aria` validation; the DS does. Custom
  // text is the value when it is allowed.
  const required = useRequiredChoice({
    filled: value !== null || (Boolean(allowsCustomValue) && input.trim() !== ""), isRequired: rest.isRequired, requiredValidation,
    isInvalid: isInvalidProp, errorMessage: errorMessageProp,
  });
  const errorMessage = required.errorMessage;
  const forwarded = forwardedInvalid(ariaInvalid);
  const errorRowLink = useErrorRowLink(forwarded.invalid, errorMessage);

  // A value set from outside shows its label (a cleared value clears the field). A label that only
  // arrives later with a server page fills the field only while the user is not typing in it.
  const focused = React.useRef(false);
  const shownFor = React.useRef<{ value: Key | null; label: string | undefined } | null>(null);
  const previous = shownFor.current;
  const valueChanged = previous === null || previous.value !== value;
  const labelArrived = !valueChanged && previous.label !== current?.label;
  if (valueChanged || labelArrived) {
    shownFor.current = { value, label: current?.label };
    const untouched = latestInput.current === "" || latestInput.current === previous?.label;
    if (valueChanged || !focused.current || untouched) {
      const text = current?.label ?? (allowsCustomValue && value === null && previous !== null ? latestInput.current : "");
      if (text !== latestInput.current) {
        latestInput.current = text;
        setInputState(text);
      }
    }
  }

  // Until the app answers a new search its rows are not shown.
  const shown = awaiting ? [] : [...source.list];
  // The chosen item off the loaded page still belongs to the collection, so its label and check hold.
  if (current && !shown.some((item) => item.id === current.id) && (query === "" || query === current.label)) shown.unshift(current);
  const typed = input.trim();
  const exact = shown.some((item) => item.label.localeCompare(typed, locale, { sensitivity: "base" }) === 0);
  if (onCreate && typed && !exact && !showAll && !awaiting) {
    shown.push({ id: CREATE_KEY, label: createLabel?.(typed) ?? createItemLabel(locale, typed) });
  }

  const appLoadMore = useLoadMore(loadItems ? undefined : onLoadMore, Boolean(isLoading), items?.length ?? 0, search);

  const commit = (key: Key | null) => {
    setOwn(key);
    onSelectionChange?.(key);
  };

  return (
    <AriaComboBox
      {...rest}
      {...forwarded.fieldProps}
      {...errorRowLink}
      isInvalid={required.isInvalid}
      items={shown}
      selectedKey={value}
      inputValue={input}
      allowsCustomValue={allowsCustomValue}
      allowsEmptyCollection
      menuTrigger={menuTrigger}
      onOpenChange={onOpenChange}
      onInputChange={(text) => {
        setInput(text);
        onType();
        // Clearing the field clears the value.
        if (text.trim() === "" && value !== null) commit(null);
      }}
      onSelectionChange={(key) => {
        if (key === CREATE_KEY) {
          onCreate?.(latestInput.current.trim());
          setInput(current?.label ?? "");
          state.current?.close();
          return;
        }
        if (key === null) {
          //: re-selecting the current option keeps it (the text still reads its label).
          if (value === null || latestInput.current === current?.label) return;
          // Custom text was committed: the key goes, the text stays.
          if (allowsCustomValue) commit(null);
          return;
        }
        if (key !== value) commit(key);
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={(event) => {
        focused.current = false;
        // Leaving the field shows the chosen label again, unless custom text is allowed.
        if (!allowsCustomValue) setInput(source.find(value)?.label ?? "");
        required.onBlur?.(event);
      }}
      aria-label={named}
      {...externalNameProps}
      data-slot="combobox"
      className={cn("group", FIELD_STACK)}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <StateBridge into={state} />
          {showLabel && <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>}
          <Group data-slot="combobox-field" isInvalid={isInvalid || forwarded.invalid} isDisabled={isDisabled} className={cn(FIELD_FRAME, FIELD_SIZE[size], "pe-ds-050")}>
            {/* The chosen item's mark while the field shows its label; typing other text hides it.
                A press on it focuses the input, as a press on the label text would; dimmed with the field when disabled. */}
            {current && hasContent(current.icon) && input === current.label && (
              <span
                aria-hidden="true"
                data-slot="combobox-value-icon"
                className={isDisabled ? cn(ITEM_ICON, "opacity-40") : ITEM_ICON}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (!isDisabled) inputRef.current?.focus();
                }}
              >
                {current.icon}
              </span>
            )}
            <Input
              ref={inputRef}
              {...(forwarded.invalid ? { "aria-invalid": true } : null)}
              placeholder={placeholder}
              data-slot="combobox-input"
              className={cn(INPUT, "text-body")}
              onKeyDown={(event) => {
                // Escape gives back the chosen label even when the filtered list no longer holds it.
                if (event.key === "Escape" && !allowsCustomValue) setInput(current?.label ?? "");
              }}
            />
            {source.loading && <FieldSpinner />}
            <LoadingState isLoading={appSearch ? Boolean(isLoading) || awaiting : isLoading} text={loadingText ?? loadingLabel(locale)} spinner={!source.loading} announce={!loadItems} />
            <Button aria-label={showSuggestionsLabel(locale)} data-slot="combobox-button" className={INLINE_ACTION}>
              <IconGlyph name="chevron-down" className={FIELD_ICON} data-slot="combobox-chevron" />
            </Button>
          </Group>
          {description && <FieldDescription>{description}</FieldDescription>}
          <ControlFieldError forwardedInvalid={forwarded.invalid}>{errorMessage}</ControlFieldError>
          <OptionList
            shown={shown}
            query={query}
            single
            appLoadMore={awaiting ? undefined : appLoadMore}
            hasMore={source.hasMore}
            loadingMore={source.loadingMore}
            loadMore={source.loadMore}
            loading={source.loading || awaiting}
            isLoading={awaiting || isLoading}
            loadingText={loadingText}
            empty={typed ? (emptyMessage ?? ((text: string) => noMatchLabel(locale, text)))(typed) : null}
          />
        </>
      )}
    </AriaComboBox>
  );
}

function sameKeys(a: readonly Key[], b: readonly Key[]) {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

function MultipleComboBox({
  label, "aria-label": ariaLabel, items, loadItems, description, errorMessage: errorMessageProp, placeholder, menuTrigger = "input", emptyMessage, onCreate,
  createLabel, onInputChange, size = "medium", selectedKeys, defaultSelectedKeys, onSelectionChange, selectedItems,
  isLoading, loadingText, "aria-invalid": ariaInvalid, onSearchChange, onLoadMore, requiredValidation, isInvalid: isInvalidProp, ...rest
}: ComboBoxMultipleProps) {
  const { locale } = useLocale();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { named, showLabel, externalNameProps } = useFieldName("ComboBox", label, ariaLabel, (rest as { "aria-labelledby"?: string })["aria-labelledby"], rest.id, inputRef);
  const [own, setOwn] = React.useState<Key[]>([...(selectedKeys ?? defaultSelectedKeys ?? [])]);
  const value = selectedKeys !== undefined ? [...selectedKeys] : own;
  const change = (keys: Key[]) => {
    setOwn(keys);
    onSelectionChange?.(keys);
  };
  const [input, setInputState] = React.useState("");
  const setInput = (text: string) => {
    setInputState(text);
    onInputChange?.(text);
  };
  const { showAll, onOpenChange, onType } = useShowAll();
  const query = showAll ? "" : input;
  const appSearch = Boolean(onSearchChange) && !loadItems;
  const source = useSource(items, loadItems, query, appSearch);
  source.remember(selectedItems ?? []);
  useSearchReport(query, appSearch ? onSearchChange : undefined);
  const awaiting = useAppResults(appSearch, query, items, Boolean(isLoading));
  const appLoadMore = useLoadMore(loadItems ? undefined : onLoadMore, Boolean(isLoading), items?.length ?? 0, query);
  const state = React.useRef<{ close: () => void } | null>(null);
  // React Aria never finds an empty selection missing under `aria` validation; the DS does.
  const required = useRequiredChoice({
    filled: value.length > 0, isRequired: rest.isRequired, requiredValidation, isInvalid: isInvalidProp, errorMessage: errorMessageProp,
  });
  const errorMessage = required.errorMessage;
  const forwarded = forwardedInvalid(ariaInvalid);
  const errorRowLink = useErrorRowLink(forwarded.invalid, errorMessage);

  // Every chosen key gets a tag; one with no known item shows its key rather than vanishing.
  const chosen = value.map((key) => source.find(key) ?? { id: key, label: String(key) });
  // Until the app answers a new search its rows are not shown.
  const shown = awaiting ? [] : [...source.list];
  for (const item of chosen) if (!shown.some((entry) => entry.id === item.id) && query === "") shown.push(item);
  const typed = input.trim();
  const exact = shown.some((item) => item.label.localeCompare(typed, locale, { sensitivity: "base" }) === 0);
  if (onCreate && typed && !exact && !showAll && !awaiting) {
    shown.push({ id: CREATE_KEY, label: createLabel?.(typed) ?? createItemLabel(locale, typed) });
  }

  return (
    <AriaComboBox
      {...rest}
      {...forwarded.fieldProps}
      {...errorRowLink}
      isInvalid={required.isInvalid}
      onBlur={required.onBlur}
      selectionMode="multiple"
      items={shown}
      value={value}
      inputValue={input}
      allowsEmptyCollection
      menuTrigger={menuTrigger}
      onOpenChange={onOpenChange}
      onInputChange={(text) => {
        setInput(text);
        onType();
      }}
      onChange={(keys) => {
        const next = [...keys];
        if (next.includes(CREATE_KEY)) {
          onCreate?.(typed);
          setInput("");
          state.current?.close();
          return;
        }
        // React Aria re-commits the same selection on blur; that is not a change and keeps the text.
        if (sameKeys(next, value)) return;
        change(next);
        setInput("");
      }}
      aria-label={named}
      {...externalNameProps}
      data-slot="combobox"
      className={cn("group", FIELD_STACK)}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <StateBridge into={state} />
          {showLabel && <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>}
          <Group
            data-slot="combobox-field"
            isInvalid={isInvalid || forwarded.invalid}
            isDisabled={isDisabled}
            className={cn(FIELD_FRAME, FIELD_SIZE[size], "flex-wrap gap-ds-050 py-[3px] pe-ds-050")}
          >
            {chosen.map((item) => (
              <span key={String(item.id)} data-slot="combobox-tag" className={TAG}>
                {/* One child either way, so the remove button keeps its place without an icon (as MultiSelect's tags). */}
                {hasContent(item.icon) ? (
                  <>
                    <span aria-hidden="true" data-slot="combobox-tag-icon" className={ITEM_ICON}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
                {!isDisabled && (
                  <OwnButton
                    aria-label={removeItemLabel(locale, item.label)}
                    data-slot="combobox-tag-remove"
                    className={TAG_REMOVE}
                    onPress={() => {
                      change(value.filter((key) => key !== item.id));
                      inputRef.current?.focus();
                    }}
                  >
                    <IconGlyph name="x" size="small" data-slot="combobox-tag-remove-icon" />
                  </OwnButton>
                )}
              </span>
            ))}
            <Input
              ref={inputRef}
              {...(forwarded.invalid ? { "aria-invalid": true } : null)}
              placeholder={chosen.length ? undefined : placeholder}
              data-slot="combobox-input"
              className={cn(INPUT, "min-w-20 text-body")}
              onKeyDown={(event) => {
                // Backspace in the empty field removes the last tag.
                if (event.key === "Backspace" && input === "" && value.length > 0) change(value.slice(0, -1));
              }}
            />
            {source.loading && <FieldSpinner />}
            <LoadingState isLoading={appSearch ? Boolean(isLoading) || awaiting : isLoading} text={loadingText ?? loadingLabel(locale)} spinner={!source.loading} announce={!loadItems} />
            <Button aria-label={showSuggestionsLabel(locale)} data-slot="combobox-button" className={INLINE_ACTION}>
              <IconGlyph name="chevron-down" className={FIELD_ICON} data-slot="combobox-chevron" />
            </Button>
          </Group>
          {description && <FieldDescription>{description}</FieldDescription>}
          <ControlFieldError forwardedInvalid={forwarded.invalid}>{errorMessage}</ControlFieldError>
          <OptionList
            shown={shown}
            query={query}
            single={false}
            appLoadMore={awaiting ? undefined : appLoadMore}
            hasMore={source.hasMore}
            loadingMore={source.loadingMore}
            loadMore={source.loadMore}
            loading={source.loading || awaiting}
            isLoading={awaiting || isLoading}
            loadingText={loadingText}
            empty={typed ? (emptyMessage ?? ((text: string) => noMatchLabel(locale, text)))(typed) : null}
          />
        </>
      )}
    </AriaComboBox>
  );
}
