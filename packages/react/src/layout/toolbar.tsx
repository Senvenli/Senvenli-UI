"use client";

import * as React from "react";
import { Toolbar as AriaToolbar, useLocale } from "react-aria-components";

import { Button } from "../action/button";
import { clearSelectionLabel, selectedCountLabel } from "../i18n";

export type ToolbarProps = {
  /** Compact (32px) controls acting on the view below: search, filters, date range, view switch, export. */
  children: React.ReactNode;
  /** Names the toolbar ("Order tools"). */
  "aria-label": string;
};

/**
 * Controls that act on the view below it. One Tab stop: arrow keys move between the controls (mirrored
 * in RTL). Put a `ToolbarSpacer` before the view and export controls to push them to the end.
 * A text-editing control inside (a SearchField's input, a DateField's segments) keeps ←/→ for its caret
 * and segments; at its edge (the caret at the start or end, the first or last segment) the arrow moves on
 * to the next control, so every control stays reachable by the arrows. Arrowing into a date or time field
 * lands on the segment nearest the way in: in RTL the visually nearest one, whatever the DOM order of its
 * segments. A raw `type="number"` or
 * `type="email"` input with a value has no readable caret and keeps ←/→ (Tab leaves it); prefer NumberField,
 * or TextField with `inputMode`, inside a toolbar.
 */
export function Toolbar({ children, "aria-label": label }: ToolbarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { toolbarProps } = useToolbarKeys(ref);
  return (
    <div
      ref={ref}
      data-slot="toolbar"
      className="flex flex-wrap items-center gap-ds-100 rounded-ds-large bg-ds-surface-raised px-ds-150 py-ds-100 shadow-ds-raised"
      data-rac=""
      aria-label={label}
      {...toolbarProps}
    >
      {children}
    </div>
  );
}

/*
 * React Aria's Toolbar (react-aria-components) handles ←/→ in a capture listener on the toolbar and
 * takes no key handler of its own, so it cannot leave the arrows to a text control inside it. This
 * mirrors its useToolbar (horizontal): same role, arrows mirrored in RTL, no wrap, Tab leaving via the
 * first/last control, focus restored on return. The one change: ←/→ on a text-editing target belong
 * to that target until the caret or segment focus is at the target's edge in the arrow's direction.
 */

// React Aria's focusable-element selector (isFocusable), so the arrows reach the same controls.
const FOCUSABLE = [
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable^="false"])',
  "permission",
]
  .map((selector) => `${selector}:not([hidden])`)
  .concat("[tabindex]:not([disabled]):not([hidden])")
  .join(",");

/*
 * React Aria's shadow-DOM-aware helpers (getActiveElement, nodeContains, getEventTarget in
 * react-aria/private/utils/shadowdom) are not part of the public react-aria-components surface, and
 * react-aria itself is not a dependency of this package, so they are mirrored here. React Aria only
 * walks shadow roots when its shadowDOM flag is on; in the light DOM (the flag's default) these give
 * exactly document.activeElement, Node.contains and event.target, as React Aria does.
 */
function getActiveElement(doc: Document = document): Element | null {
  let active = doc.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

function nodeContains(node: Node | null | undefined, other: Node | null | undefined): boolean {
  if (!node || !other) return false;
  for (let current: Node | null = other; current; ) {
    if (current === node) return true;
    const slot: HTMLSlotElement | null | undefined = (current as Element).assignedSlot;
    // A slotted element continues from its slot (a slot itself walks up as usual).
    if (typeof (current as HTMLSlotElement).assignedElements !== "function" && slot?.parentNode) current = slot.parentNode;
    else if (current instanceof ShadowRoot) current = current.host;
    else current = current.parentNode;
  }
  return false;
}

function getEventTarget(e: React.SyntheticEvent): Element {
  const target = e.target as Element;
  if (target instanceof Element && target.shadowRoot) {
    const inner = e.nativeEvent.composedPath?.()[0];
    if (inner instanceof Element) return inner;
  }
  return target;
}

// Inputs that do not use ←/→ themselves: the toolbar always takes the arrows from them.
const ARROWLESS_INPUTS = new Set(["button", "submit", "reset", "checkbox", "image", "file", "color"]);
/*
 * Inputs whose value ←/→ change, so the arrows always stay with them: React Aria's RadioGroup moves the
 * selection between its radios and its Slider moves the thumb with ←/→ (no caret, so no edge).
 */
const VALUE_ARROW_INPUTS = new Set(["radio", "range"]);

function isRtl(element: Element, fallback: "ltr" | "rtl") {
  const computed = getComputedStyle(element).direction;
  if (computed === "rtl" || computed === "ltr") return computed === "rtl";
  // jsdom resolves no `direction`; :dir() reads the dir attribute the same way the browser does.
  try {
    return element.matches(":dir(rtl)");
  } catch {
    return fallback === "rtl";
  }
}

/**
 * The segment group (`role="group"`) of a date/time segment inside the toolbar, else undefined. Only
 * segments step from their group: a text input is one element, and its group (the field frame) also holds
 * controls of its own (a SearchField's clear button, InputActions) that the arrows should still reach.
 */
function segmentGroup(target: Element, toolbar: Element): Element | undefined {
  if (target.getAttribute("role") !== "spinbutton") return undefined;
  const group = target.closest('[role="group"]');
  return group && group !== toolbar && toolbar.contains(group) ? group : undefined;
}

function isTabbable(element: HTMLElement) {
  return element.tabIndex >= 0;
}

/**
 * True when the arrow key belongs to the target: a caret that can still move that way in a text input or
 * textarea, a date/time segment with another segment that way, a radio or slider, or a contenteditable
 * or textbox whose caret the toolbar cannot read. A non-collapsed selection always stays with the field.
 * `direction` is the toolbar's (the locale's), as React Aria's date segments use it.
 */
function keepsArrows(target: Element, key: "ArrowLeft" | "ArrowRight", direction: "ltr" | "rtl") {
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    const field = target as HTMLInputElement | HTMLTextAreaElement;
    if (tag === "INPUT" && ARROWLESS_INPUTS.has(field.type)) return false;
    if (tag === "INPUT" && VALUE_ARROW_INPUTS.has(field.type)) return true;
    let start: number | null;
    let end: number | null;
    try {
      start = field.selectionStart;
      end = field.selectionEnd;
    } catch {
      start = end = null;
    }
    /*
     * number, email…: the browser exposes no caret (selectionStart is null), so the toolbar cannot tell
     * an edge. Empty, there is no caret to move and the arrows move on; with a value the field keeps them,
     * since taking them would leave no way to move the caret. Tab leaves such a field. The DS's own
     * fields avoid this: NumberField is a text input, and TextField takes `inputMode` for e-mail.
     */
    if (start == null || end == null) return field.value !== "";
    if (start !== end) return true;
    // The caret's back key is ← in an LTR field and → in an RTL one: the field's own direction.
    const back = isRtl(field, direction) ? key === "ArrowRight" : key === "ArrowLeft";
    return back ? start > 0 : end < field.value.length;
  }
  const role = target.getAttribute("role");
  if (role === "spinbutton") {
    const group = target.closest('[role="group"]');
    if (group) return hasSegmentToward(group, target as HTMLElement, key, direction);
    return true;
  }
  if (role === "textbox" || role === "searchbox") return true;
  return target.closest('[contenteditable]:not([contenteditable^="false"])') != null;
}

/**
 * Whether React Aria's date/time field would move to another segment for this arrow (useDatePickerGroup):
 * in LTR the previous/next tabbable segment in DOM order; in RTL the nearest segment visually to that
 * side (its bounding box), since RTL date and time segments are not laid out in DOM order.
 */
function hasSegmentToward(group: Element, segment: HTMLElement, key: "ArrowLeft" | "ArrowRight", direction: "ltr" | "rtl") {
  const segments = Array.from(group.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => isTabbable(element) && isVisible(element),
  );
  if (direction === "rtl") {
    const from = segment.getBoundingClientRect().x;
    const sign = key === "ArrowRight" ? 1 : -1;
    return segments.some((element) => element !== segment && Math.sign(element.getBoundingClientRect().x - from) === sign);
  }
  const index = segments.indexOf(segment);
  if (index === -1) return true;
  return key === "ArrowLeft" ? index > 0 : index < segments.length - 1;
}

/**
 * In RTL, the segment an arrow should land on when it moves INTO a date/time field: the one
 * visually nearest the side focus enters from, by bounding box as `hasSegmentToward` reads it, since RTL
 * segments need not be laid out in DOM order. A step toward the toolbar's end (`step` 1, ← in RTL) enters
 * at the field's start side, the segment furthest toward the start; a step toward the start enters at its
 * end side. Any other target, or segments without a layout (equal boxes), keep the DOM-order choice.
 */
function entrySegment(next: HTMLElement, toolbar: Element, step: 1 | -1): HTMLElement {
  const group = segmentGroup(next, toolbar);
  if (!group) return next;
  const segments = Array.from(group.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => isTabbable(element) && isVisible(element),
  );
  // In RTL the start side is the larger x: a step of 1 enters the field at its start side (largest x), -1 at its end side.
  const enterAtStartSide = step === 1;
  let best = next;
  let bestX = next.getBoundingClientRect().x;
  for (const element of segments) {
    const x = element.getBoundingClientRect().x;
    if (enterAtStartSide ? x > bestX : x < bestX) {
      best = element;
      bestX = x;
    }
  }
  return best;
}

function isVisible(element: Element): boolean {
  if (typeof element.checkVisibility === "function") {
    return element.checkVisibility({ visibilityProperty: true }) && !element.closest("[data-react-aria-prevent-focus]");
  }
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute("hidden") || node.hasAttribute("data-react-aria-prevent-focus")) return false;
    const { display, visibility } = getComputedStyle(node);
    if (display === "none" || visibility === "hidden" || visibility === "collapse") return false;
  }
  return true;
}

function focusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.closest("[inert]") && isVisible(element),
  );
}

function useToolbarKeys(ref: React.RefObject<HTMLDivElement | null>) {
  const { direction } = useLocale();
  const [isInToolbar, setInToolbar] = React.useState(false);
  React.useLayoutEffect(() => {
    setInToolbar(!!ref.current?.parentElement?.closest('[role="toolbar"]'));
  });
  const lastFocused = React.useRef<Element | null>(null);

  /*
   * Moves to the next/previous control in DOM order from `from` (the focused element by default). `from` is
   * a whole segment group when the arrow leaves a date/time field: the step starts after (or before) the
   * group, never at a sibling segment, since in RTL the visual edge segment need not be the DOM-order edge
   * (an `ar` TimeField or a `he-IL` date keeps DOM order; an `ar` date is reversed). Arrowing INTO such a
   * field in RTL lands on its segment visually nearest the way in (`entrySegment`); LTR keeps DOM order.
   * Plain focus(), as React Aria's focus manager does: the control scrolls into view.
   */
  const move = (step: 1 | -1, from?: Element) => {
    const root = ref.current;
    if (!root) return;
    const all = focusables(root);
    const active = from ?? getActiveElement();
    let next: HTMLElement | undefined;
    if (!active || !nodeContains(root, active)) next = step === 1 ? all[0] : all[all.length - 1];
    else if (step === 1) {
      // FOLLOWING includes the group's own descendants: skip them.
      next = all.find((el) => active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && !active.contains(el));
    } else next = all.filter((el) => active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING).pop();
    // Into a date/time field in RTL: the segment nearest the side the arrow enters from, not the DOM-first one.
    if (next && direction === "rtl") next = entrySegment(next, root, step);
    next?.focus();
  };
  const edge = (end: "first" | "last") => {
    const all = ref.current ? focusables(ref.current) : [];
    (end === "first" ? all[0] : all[all.length - 1])?.focus();
  };

  const onKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = getEventTarget(e);
    // Portalled content (a popover opened from a control) is not the toolbar's.
    if (!nodeContains(e.currentTarget, target)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if (keepsArrows(target, e.key, direction)) return;
      const forward = e.key === "ArrowRight" ? 1 : -1;
      move(direction === "rtl" ? (-forward as 1 | -1) : forward, segmentGroup(target, e.currentTarget));
    } else if (e.key === "Tab") {
      // Focus the first/last control and let the browser's Tab carry focus out from there.
      lastFocused.current = getActiveElement();
      edge(e.shiftKey ? "first" : "last");
      return;
    } else return;
    // Keep nested action groups (and the field the arrow moved out of) from handling the arrows too.
    e.stopPropagation();
    e.preventDefault();
  };
  // Remember the control focus came from, and return to it when focus comes back into the toolbar.
  const onBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!nodeContains(e.currentTarget, e.relatedTarget) && !lastFocused.current) lastFocused.current = getEventTarget(e);
  };
  const onFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const last = lastFocused.current;
    if (last && !nodeContains(e.currentTarget, e.relatedTarget) && nodeContains(ref.current, getEventTarget(e))) {
      lastFocused.current = null;
      (last as HTMLElement).focus?.();
    }
  };

  return {
    toolbarProps: {
      role: isInToolbar ? "group" : "toolbar",
      "aria-orientation": "horizontal" as const,
      "data-orientation": "horizontal",
      onKeyDownCapture: isInToolbar ? undefined : onKeyDownCapture,
      onFocusCapture: isInToolbar ? undefined : onFocusCapture,
      onBlurCapture: isInToolbar ? undefined : onBlurCapture,
    },
  };
}

/** Pushes the controls after it to the toolbar's end. */
export function ToolbarSpacer() {
  return <span aria-hidden data-slot="toolbar-spacer" className="flex-1" />;
}

export type BulkBarProps = {
  /** How many rows are selected; announced as it changes. */
  selectedCount: number;
  /** The bulk actions (compact Buttons): "Send reminder", "Export". */
  actions: React.ReactNode;
  /** Clears the selection; the bar goes with it. */
  onClear: () => void;
  /** Names the bar ("Selected orders"). */
  "aria-label": string;
};

/**
 * Replaces the toolbar while rows are selected: the count, the bulk actions and a clear button, on
 * `ds-background-neutral-bold`. One Tab stop with arrow keys inside, like the toolbar. Buttons in the bar
 * are drawn transparent with inverse text whatever their variant: pass default (not primary) actions.
 */
export function BulkBar({ selectedCount, actions, onClear, "aria-label": label }: BulkBarProps) {
  const { locale } = useLocale();
  const count = selectedCountLabel(locale, selectedCount);
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => setSpoken(count), [count]);
  return (
    <AriaToolbar
      aria-label={label}
      data-slot="bulk-bar"
      className={
        "flex flex-wrap items-center gap-ds-150 rounded-ds-large bg-ds-background-neutral-bold px-ds-150 py-ds-100 text-ds-text-inverse " +
        // Buttons read on the dark bar: transparent with inverse text, the neutral pressed step on hover.
        "[&_[data-slot=button]]:bg-transparent [&_[data-slot=button]]:text-ds-text-inverse " +
        "[&_[data-slot=button][data-hovered]]:bg-ds-background-neutral-pressed [&_[data-slot=button][data-hovered]]:text-ds-text " +
        "[&_[data-slot=button][data-pressed]]:bg-ds-background-neutral-pressed [&_[data-slot=button][data-pressed]]:text-ds-text " +
        "[&_[data-slot=button][data-focus-visible]]:inset-ring-ds-text-inverse"
      }
    >
      <span data-slot="bulk-bar-count" aria-hidden className="text-body-strong tabular-nums">
        {count}
      </span>
      {/* Mounted empty and filled after mount: a live region born with its text is usually not read, so the
          first count (0 → 1, the bar appearing) would go unannounced. */}
      <span data-slot="bulk-bar-announcer" role="status" className="sr-only">
        {spoken}
      </span>
      {actions}
      <span aria-hidden className="flex-1" />
      <Button size="small" iconOnly iconBefore="x" aria-label={clearSelectionLabel(locale)} onPress={onClear} />
    </AriaToolbar>
  );
}
