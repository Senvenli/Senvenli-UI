"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay, useLocale } from "react-aria-components";
import { cn } from "../utils";
import { MotionScope, type WithMotion, useMotionAttribute, useReducedMotion } from "../defaults";
import { Button } from "../action/button";
import { CloseButton } from "../action/close-button";
import { stepOfLabel, tourBackLabel, tourFinishLabel, tourNextLabel, tourSkipLabel } from "../i18n";
import { OverlayContents } from "./overlay-base";

/**
 * What a step points at: a CSS selector (the first visible match, e.g. `[data-tour-id="orders"]`), a ref, or a
 * function that returns the element. Left out, the step is a centred panel with nothing highlighted.
 */
export type TourTarget = string | React.RefObject<Element | null> | (() => Element | null);

/** The side of the target the panel prefers; `start` and `end` follow the reading direction. */
export type TourPlacement = "top" | "bottom" | "start" | "end";

export type TourStep = {
  /** A stable name for the step, for the app's own bookkeeping (analytics, "seen" flags). */
  id?: string;
  target?: TourTarget;
  /** A few words: the panel's heading and its accessible name. */
  title: React.ReactNode;
  /** One or two sentences on what the highlighted part does. */
  description?: React.ReactNode;
  /** This step's side of the target; the tour's `placement` otherwise. */
  placement?: TourPlacement;
};

export type TourProps = {
  steps: readonly TourStep[];
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** The current step's index (0-based), controlled. */
  step?: number;
  /** The step an uncontrolled tour starts at each time it opens; default 0. */
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Done on the last step. The tour then closes. */
  onFinish?: () => void;
  /** Skip, the close button or Esc. The tour then closes. Kept apart from `onFinish` so an app can tell them apart. */
  onSkip?: () => void;
  /**
   * `true` (default): the page is dimmed except the target, which cannot be pressed, and focus stays in the panel
   * (a modal dialog). `false`: no dimming, the page stays usable and the panel is a non-modal dialog.
   */
  mask?: boolean;
  /** Room between the target and the edge of the lit area, in px; default 6. */
  spotlightPadding?: number;
  /** The side of the target the panel prefers; default `bottom`. It flips when that side has no room. */
  placement?: TourPlacement;
  /** "Step 2 of 5" above the title; default true. */
  showProgress?: boolean;
  /** Scroll a target that is out of view to the middle of the screen; default true. */
  scrollIntoView?: boolean;
  /** How long to wait for a target that is not on the page yet (a route still loading), in ms; default 3000. */
  targetTimeout?: number;
  /** When a target never appears: `center` (default) shows the step as a centred panel; `skip` moves on in the direction of travel. */
  missingTarget?: "center" | "skip";
  /** Turn off the arrow keys moving between steps. Esc still skips. */
  isKeyboardNavigationDisabled?: boolean;
};

const GAP = 12;
const MARGIN = 16;

type Rect = { top: number; left: number; width: number; height: number; bottom: number; right: number };
type Side = "top" | "bottom" | "left" | "right";
type Position = { top: number; left: number; side: Side } | null;
type TargetState = { status: "none" | "pending" | "found" | "missing"; element: Element | null };
type KeyedTarget = TargetState & { key: number };

function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
}

function resolveTarget(target: TourTarget | undefined): Element | null {
  if (!target) return null;
  if (typeof target === "function") return target();
  if (typeof target !== "string") return target.current;
  let matches: NodeListOf<Element>;
  try {
    matches = document.querySelectorAll(target);
  } catch {
    if (process.env.NODE_ENV !== "production") console.warn(`Tour: "${target}" is not a valid CSS selector.`);
    return null;
  }
  for (const element of matches) if (isVisible(element)) return element;
  return null;
}

/** The step's element: found at once, or polled for until `timeout`, as a route may still be rendering it. */
function useTarget(target: TourTarget | undefined, active: boolean, stepKey: number, timeout: number): TargetState {
  const [state, setState] = React.useState<KeyedTarget>({ status: "none", element: null, key: -1 });
  const targetRef = React.useRef(target);
  targetRef.current = target;
  React.useLayoutEffect(() => {
    if (!active) return;
    const wanted = targetRef.current;
    if (!wanted) {
      setState({ status: "none", element: null, key: stepKey });
      return;
    }
    const found = resolveTarget(wanted);
    if (found) {
      setState({ status: "found", element: found, key: stepKey });
      return;
    }
    setState({ status: "pending", element: null, key: stepKey });
    const started = Date.now();
    const timer = window.setInterval(() => {
      const element = resolveTarget(targetRef.current);
      if (element) {
        window.clearInterval(timer);
        setState({ status: "found", element, key: stepKey });
      } else if (Date.now() - started >= timeout) {
        window.clearInterval(timer);
        setState({ status: "missing", element: null, key: stepKey });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, stepKey, timeout]);
  if (!active) return { status: "none", element: null };
  // Until this step's own lookup has run, the last step's answer ("missing") must not act on this one.
  return state.key === stepKey ? state : { status: "pending", element: null };
}

function toRect(rect: DOMRect): Rect {
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right };
}

/** The target's box in the viewport, kept current through scrolling, resizing and the target's own size changes. */
function useTargetRect(element: Element | null): Rect | null {
  const [rect, setRect] = React.useState<Rect | null>(null);
  React.useLayoutEffect(() => {
    if (!element) {
      setRect(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRect(toRect(element.getBoundingClientRect())));
    };
    setRect(toRect(element.getBoundingClientRect()));
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [element]);
  return rect;
}

function physical(placement: TourPlacement, rtl: boolean): Side {
  if (placement === "start") return rtl ? "right" : "left";
  if (placement === "end") return rtl ? "left" : "right";
  return placement;
}

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/**
 * Where the panel goes: the preferred side, else the opposite one, else either of the other two; the cross axis is
 * kept on screen. `null` when no side has room (a target taller than a phone's screen): the panel is then centred.
 */
export function placePanel(
  target: Rect,
  panel: { width: number; height: number },
  preferred: Side,
  viewport: { width: number; height: number },
): Position {
  const clamp = (value: number, size: number, limit: number) => Math.min(Math.max(value, MARGIN), Math.max(MARGIN, limit - size - MARGIN));
  const others = (["bottom", "top", "right", "left"] as Side[]).filter((side) => side !== preferred && side !== OPPOSITE[preferred]);
  for (const side of [preferred, OPPOSITE[preferred], ...others]) {
    if (side === "bottom" || side === "top") {
      const top = side === "bottom" ? target.bottom + GAP : target.top - GAP - panel.height;
      if (top < MARGIN || top + panel.height > viewport.height - MARGIN) continue;
      return { side, top, left: clamp(target.left + target.width / 2 - panel.width / 2, panel.width, viewport.width) };
    }
    const left = side === "right" ? target.right + GAP : target.left - GAP - panel.width;
    if (left < MARGIN || left + panel.width > viewport.width - MARGIN) continue;
    return { side, left, top: clamp(target.top + target.height / 2 - panel.height / 2, panel.height, viewport.height) };
  }
  return null;
}

function isEditable(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT";
}

const PANEL =
  "fixed flex w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col overflow-auto rounded-ds-large [--ds-surface-radius:var(--ds-radius-large)] " +
  "bg-ds-surface-overlay p-ds-200 text-ds-text shadow-ds-overlay outline-hidden " +
  "transition-[top,left,opacity] duration-(--ds-duration-medium) ease-ds-enter motion-reduce:transition-none";

/** The lit area: a rounded box whose huge shadow is the dimming, so the target shows through it untouched. */
const SPOTLIGHT =
  "pointer-events-none fixed rounded-ds-medium shadow-[0_0_0_100vmax_var(--ds-blanket)] " +
  "transition-[top,left,width,height] duration-(--ds-duration-medium) ease-ds-enter motion-reduce:transition-none";

function TourRoot({
  steps,
  isOpen: isOpenProp,
  defaultOpen,
  onOpenChange,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onFinish,
  onSkip,
  mask = true,
  spotlightPadding = 6,
  placement = "bottom",
  showProgress = true,
  scrollIntoView = true,
  targetTimeout = 3000,
  missingTarget = "center",
  isKeyboardNavigationDisabled = false,
}: TourProps) {
  const { locale, direction } = useLocale();
  const rtl = direction === "rtl";
  const reduced = useReducedMotion();
  const motion = useMotionAttribute();
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen ?? false);
  const isOpen = isOpenProp ?? ownOpen;
  const [ownStep, setOwnStep] = React.useState(defaultStep);
  const total = steps.length;
  const index = Math.min(Math.max(stepProp ?? ownStep, 0), Math.max(total - 1, 0));
  const current = steps[index];
  const travel = React.useRef<1 | -1>(1);
  const panelRef = React.useRef<HTMLElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const returnTo = React.useRef<HTMLElement | null>(null);
  const descriptionId = React.useId();
  const [position, setPosition] = React.useState<Position>(null);
  const [placed, setPlaced] = React.useState(false);

  // An uncontrolled tour starts from `defaultStep` each time it opens; the element focused before is where focus returns.
  const wasOpen = React.useRef(false);
  if (isOpen && !wasOpen.current && typeof document !== "undefined") {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  React.useEffect(() => {
    if (isOpen && !wasOpen.current && stepProp === undefined) setOwnStep(defaultStep);
    wasOpen.current = isOpen;
  }, [isOpen, stepProp, defaultStep]);

  const setOpen = (next: boolean) => {
    if (isOpenProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
    // Non-modal, nothing restores focus for us; the modal's own focus scope does it otherwise.
    if (!next && !mask) returnTo.current?.focus?.({ preventScroll: true });
  };
  const goTo = (next: number) => {
    if (next < 0 || next >= total || next === index) return;
    travel.current = next < index ? -1 : 1;
    if (stepProp === undefined) setOwnStep(next);
    onStepChange?.(next);
  };
  const finish = () => {
    onFinish?.();
    setOpen(false);
  };
  const skip = () => {
    onSkip?.();
    setOpen(false);
  };
  const next = () => (index >= total - 1 ? finish() : goTo(index + 1));
  const back = () => goTo(index - 1);

  const target = useTarget(current?.target, isOpen && !!current, index, targetTimeout);
  const rect = useTargetRect(target.element);
  const centered = target.status === "none" || (target.status === "missing" && missingTarget === "center");

  // A target that never came: move on in the direction of travel (ending the tour past the last step).
  React.useEffect(() => {
    if (target.status !== "missing" || missingTarget !== "skip") return;
    if (travel.current === -1 && index > 0) back();
    else next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.status, index]);

  // Bring an off-screen target to the middle of the screen; the rect follows through the scroll events.
  React.useEffect(() => {
    const element = target.element;
    if (!scrollIntoView || !element) return;
    const box = element.getBoundingClientRect();
    const inView = box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth;
    if (!inView) element.scrollIntoView?.({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [target.element, scrollIntoView, reduced]);

  // Place the panel against the target once both sizes are known; hidden until then, so it never jumps.
  React.useLayoutEffect(() => {
    if (!isOpen || target.status === "pending" || (target.status === "missing" && missingTarget === "skip")) {
      setPlaced(false);
      return;
    }
    if (centered || !rect) {
      setPosition(null);
      setPlaced(true);
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const pad = spotlightPadding;
    const lit = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, bottom: rect.bottom + pad, right: rect.right + pad };
    const side = physical(current?.placement ?? placement, rtl);
    setPosition(placePanel(lit, { width: panel.offsetWidth, height: panel.offsetHeight }, side, { width: window.innerWidth, height: window.innerHeight }));
    setPlaced(true);
  }, [isOpen, rect, centered, target.status, missingTarget, spotlightPadding, current?.placement, placement, rtl, index]);

  // Each step's heading takes focus, so a screen reader reads where the tour went; the status line says how far.
  React.useEffect(() => {
    if (isOpen && placed) titleRef.current?.focus({ preventScroll: true });
  }, [isOpen, placed, index]);

  if (!isOpen || !current) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!mask && event.key === "Escape") {
      event.stopPropagation();
      skip();
      return;
    }
    if (isKeyboardNavigationDisabled || isEditable(event.target)) return;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward) {
      event.preventDefault();
      next();
    } else if (event.key === backward) {
      event.preventDefault();
      back();
    }
  };

  const last = index === total - 1;
  const progress = stepOfLabel(locale, index + 1, total);
  const style: React.CSSProperties = position ? { top: position.top, left: position.left } : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  const spot = !centered && target.status === "found" ? rect : null;

  const panel = (
    <AriaDialog
      ref={panelRef as React.Ref<HTMLElement>}
      aria-describedby={current.description ? descriptionId : undefined}
      data-slot="tour"
      data-side={position?.side ?? "center"}
      data-step={index}
      style={style}
      className={cn(PANEL, !placed && "invisible opacity-0", !mask && "z-50")}
    >
      <OverlayContents>
        {/* Keys from anything focused in the panel (the heading, a button) bubble here. */}
        <div onKeyDown={onKeyDown} className="flex flex-col gap-ds-150">
          <div className="flex items-start justify-between gap-ds-100">
            <div className="flex min-w-0 flex-col gap-ds-050">
              {showProgress && total > 1 && (
                <span data-slot="tour-progress" className="text-body-small text-ds-text-subtle">
                  {progress}
                </span>
              )}
              <Heading
                ref={titleRef}
                slot="title"
                tabIndex={-1}
                data-slot="tour-title"
                className="m-0 -mx-ds-050 px-ds-050 text-heading-small outline-hidden focus-visible:rounded-ds-small focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused"
              >
                {current.title}
              </Heading>
            </div>
            {/* Pulled into the corner so its icon lines up with the padding, as Dialog's. */}
            <span data-slot="tour-close-wrap" className="-me-ds-100 -mt-ds-050 flex shrink-0">
              <CloseButton data-slot="tour-close" onPress={skip} />
            </span>
          </div>
          {current.description && (
            <div id={descriptionId} data-slot="tour-description" className="text-body text-ds-text-subtle">
              {current.description}
            </div>
          )}
          <div data-slot="tour-footer" className="flex flex-wrap items-center gap-ds-100">
            <span className="-ms-ds-100 flex">
              <Button data-slot="tour-skip" variant="subtle" size="small" onPress={skip}>
                {tourSkipLabel(locale)}
              </Button>
            </span>
            <div className="ms-auto flex gap-ds-100">
              {index > 0 && (
                <Button data-slot="tour-back" variant="default" size="small" onPress={back}>
                  {tourBackLabel(locale)}
                </Button>
              )}
              <Button data-slot="tour-next" variant="primary" size="small" onPress={next}>
                {last ? tourFinishLabel(locale) : tourNextLabel(locale)}
              </Button>
            </div>
          </div>
          <span role="status" data-slot="tour-status" className="sr-only">
            {placed && total > 1 ? progress : ""}
          </span>
        </div>
      </OverlayContents>
    </AriaDialog>
  );

  if (!mask) {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div {...motion} data-slot="tour-layer" style={{ display: "contents" }}>
        {panel}
      </div>,
      document.body,
    );
  }

  return (
    <ModalOverlay
      {...motion}
      isOpen
      // Outside presses (the dimmed page, the target) do nothing; Esc skips.
      isDismissable={false}
      onOpenChange={(open) => {
        if (!open) skip();
      }}
      data-slot="tour-overlay"
      className={cn("fixed inset-0 z-50", !spot && "bg-ds-blanket")}
    >
      {spot && (
        <div
          aria-hidden
          data-slot="tour-spotlight"
          className={SPOTLIGHT}
          style={{
            top: spot.top - spotlightPadding,
            left: spot.left - spotlightPadding,
            width: spot.width + spotlightPadding * 2,
            height: spot.height + spotlightPadding * 2,
          }}
        />
      )}
      <Modal data-slot="tour-modal" className="outline-hidden">
        {panel}
      </Modal>
    </ModalOverlay>
  );
}

/**
 * A guided tour: a short sequence of steps, each pointing at a part of the page with a title, a sentence and
 * Back / Next / Done, plus Skip. By default the page is dimmed except the step's target, which cannot be pressed,
 * and focus stays in the panel; `mask={false}` keeps the page usable. Arrow keys move between steps (mirrored
 * right to left), Esc skips. A target can be a selector, a ref or a function; one that is not on the page yet is
 * waited for, then shown centred or skipped.
 */
export function Tour({ motion, ...props }: TourProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <TourRoot {...props} />
    </MotionScope>
  );
}
