"use client";

import * as React from "react";
import {
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components";

import { cn } from "../utils";
import { Button } from "../action/button";
import { CloseButton } from "../action/close-button";
import { IconGlyph, type IconName } from "../display/icon";
import { LAYER } from "../layers";

// Built on React Aria's toast . React Aria
// still exports it as UNSTABLE_*; if that API changes, only this wrapper changes, never a call site.

export type ToastTone = "success" | "danger" | "information";

export type ToastOptions = {
  /** Past tense of what happened: "Order confirmed". */
  title: string;
  /** One line of detail: "ORD-0914 · email sent to the customer". */
  description?: string;
  tone?: ToastTone;
  /** At most one, a link: "Undo" for a reversible delete, "View". The toast closes after it runs. */
  action?: { label: string; onPress: () => void };
  /**
   * Milliseconds; 6000 by default. A `danger` toast stays until dismissed unless one is given; 0 keeps any toast
   * until it is dismissed.
   */
  timeout?: number;
};

type ToastContent = Omit<ToastOptions, "timeout">;

/** One queue for the page: three toasts at most on screen, the rest wait their turn. */
const queue = new ToastQueue<ToastContent>({ maxVisibleToasts: 3 });

const DEFAULT_TIMEOUT = 6000;

function show(options: ToastOptions): string {
  const { timeout, ...content } = options;
  const tone = content.tone ?? "information";
  const stays = tone === "danger" && timeout === undefined;
  return queue.add({ ...content, tone }, stays || timeout === 0 ? {} : { timeout: timeout ?? DEFAULT_TIMEOUT });
}

type ToastShortcut = (title: string, options?: Omit<ToastOptions, "title" | "tone">) => string;

/**
 * Shows a toast from anywhere (an event handler, a mutation callback), with no hook or provider to reach:
 * `toast("Saved")`, `toast.success("Order confirmed", { action })`, `toast.danger("Photo
 * upload failed")`. Returns the toast's key for `toast.dismiss(key)`.
 */
export const toast: ((titleOrOptions: string | ToastOptions) => string) & {
  success: ToastShortcut;
  danger: ToastShortcut;
  information: ToastShortcut;
  dismiss: (key: string) => void;
} = Object.assign((titleOrOptions: string | ToastOptions) => show(typeof titleOrOptions === "string" ? { title: titleOrOptions } : titleOrOptions), {
  success: ((title, options) => show({ ...options, title, tone: "success" })) as ToastShortcut,
  danger: ((title, options) => show({ ...options, title, tone: "danger" })) as ToastShortcut,
  information: ((title, options) => show({ ...options, title, tone: "information" })) as ToastShortcut,
  dismiss: (key: string) => queue.close(key),
});

/** Test isolation only (not exported from the package): close every toast. */
export function clearToastsForTests() {
  for (const item of [...queue.visibleToasts]) queue.close(item.key);
  // Waiting toasts become visible as others close; drain until none is left.
  for (let i = 0; i < 50 && queue.visibleToasts.length; i++) for (const item of [...queue.visibleToasts]) queue.close(item.key);
}

const ICON: Record<ToastTone, { name: IconName; className: string }> = {
  success: { name: "circle-check", className: "text-ds-icon-success" },
  danger: { name: "circle-x", className: "text-ds-icon-danger" },
  information: { name: "info", className: "text-ds-icon-information" },
};

/** Set by the first Toaster in a tree; a second one there (a nested provider) renders nothing. */
const ToasterMountedContext = React.createContext(false);

/**
 * One region per page across trees too (two React roots, a standalone Toaster beside the provider): of the
 * Toasters that would render, the first mounted owns the queue and the others render nothing, or every toast
 * would show twice. When the owner unmounts, the next one in mount order takes over.
 */
const candidates: symbol[] = [];
const ownerListeners = new Set<() => void>();
function useRegionOwner(enabled: boolean) {
  const [me] = React.useState(() => Symbol("toaster"));
  React.useEffect(() => {
    if (!enabled) return;
    candidates.push(me);
    ownerListeners.forEach((listener) => listener());
    return () => {
      candidates.splice(candidates.indexOf(me), 1);
      ownerListeners.forEach((listener) => listener());
    };
  }, [me, enabled]);
  return React.useSyncExternalStore(
    (notify) => {
      ownerListeners.add(notify);
      return () => ownerListeners.delete(notify);
    },
    () => candidates[0] === me,
    () => false,
  );
}

/**
 * The toast region: bottom-right (bottom-centre on phones), clear of the home indicator and of a shown
 * floating banner (`--ds-floating-banner-offset`, as the Fab). DesignSystemProvider mounts it, so apps add
 * nothing; on its own it is for pages without the provider. Toasts pause while the region is hovered or
 * focused; F6 reaches it from the keyboard. It renders only while a toast is showing.
 */
export function Toaster() {
  const mounted = React.useContext(ToasterMountedContext);
  // A Toaster under one that is already mounted never renders, so it never claims the queue either.
  const owns = useRegionOwner(!mounted);
  // The region exists only while a toast is on screen: React Aria's region registers a page-wide landmark
  // listener (F6), which a page with no toasts should not carry.
  const showing = React.useSyncExternalStore(
    (notify) => queue.subscribe(notify),
    () => queue.visibleToasts.length > 0,
    () => false,
  );
  if (!owns || !showing) return null;
  return (
    <AriaToastRegion
      queue={queue}
      data-slot="toast-region"
      className={cn(
        LAYER.toast,
        "fixed flex flex-col-reverse gap-ds-100 outline-hidden",
        "bottom-[max(calc(var(--ds-space-200)+env(safe-area-inset-bottom,0px)),calc(var(--ds-floating-banner-offset,0px)+var(--ds-space-150)))]",
        "inset-x-ds-200 items-center sm:inset-x-auto sm:end-ds-300 sm:items-end",
        "sm:bottom-[max(calc(var(--ds-space-300)+env(safe-area-inset-bottom,0px)),calc(var(--ds-floating-banner-offset,0px)+var(--ds-space-150)))]",
      )}
    >
      {({ toast: item }) => (
        <AriaToast
          toast={item}
          data-slot="toast"
          data-tone={item.content.tone}
          className={cn(
            "flex w-full max-w-90 items-start gap-ds-150 rounded-ds-large bg-ds-surface-overlay p-ds-150 text-ds-text shadow-ds-overlay outline-hidden",
            "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
            // Enters from below in ds-duration-medium with the enter easing (@starting-style: no keyframes needed).
            "transition-[opacity,translate] duration-(--ds-duration-medium) ease-ds-enter starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
          )}
        >
          <IconGlyph name={ICON[item.content.tone ?? "information"].name} data-slot="toast-icon" className={cn("mt-0.5 size-5 shrink-0", ICON[item.content.tone ?? "information"].className)} />
          <AriaToastContent data-slot="toast-content" className="flex min-w-0 flex-1 flex-col gap-ds-025">
            <Text slot="title" data-slot="toast-title" className="text-body-strong">{item.content.title}</Text>
            {item.content.description && (
              <Text slot="description" data-slot="toast-description" className="text-body-small text-ds-text-subtle">{item.content.description}</Text>
            )}
          </AriaToastContent>
          {item.content.action && (
            <Button
              variant="link"
              size="compact"
              data-slot="toast-action"
              onPress={() => {
                item.content.action!.onPress();
                queue.close(item.key);
              }}
            >
              {item.content.action.label}
            </Button>
          )}
          <CloseButton data-slot="toast-close" onPress={() => queue.close(item.key)} />
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}

/** For DesignSystemProvider: the region once, then the app, which can no longer mount a second one. */
export function ToasterRoot({ children }: { children: React.ReactNode }) {
  const mounted = React.useContext(ToasterMountedContext);
  return (
    <ToasterMountedContext.Provider value>
      {children}
      {!mounted && <ToasterRegionOnly />}
    </ToasterMountedContext.Provider>
  );
}

function ToasterRegionOnly() {
  return (
    <ToasterMountedContext.Provider value={false}>
      <Toaster />
    </ToasterMountedContext.Provider>
  );
}
