"use client";

import type { Tone } from "../tone";
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

export type ToastTone = Extract<Tone, "information" | "success" | "danger">;

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

type ToastContent = Omit<ToastOptions, "timeout"> & {
  /** Set by toast.promise: the toast reads its live state (pending, then the result) from the store below. */
  pendingId?: string;
};

/* ── toast.promise: one toast that turns from "working" into the result, in place ───────────────────────── */

type PromiseState = { status: "pending" | "success" | "danger"; title: string; description?: string };
const promiseStates = new Map<string, PromiseState>();
const promiseListeners = new Set<() => void>();
let promiseCounter = 0;

function setPromiseState(id: string, state: PromiseState) {
  promiseStates.set(id, state);
  promiseListeners.forEach((listener) => listener());
}

function usePromiseState(id: string | undefined): PromiseState | undefined {
  return React.useSyncExternalStore(
    (notify) => {
      promiseListeners.add(notify);
      return () => promiseListeners.delete(notify);
    },
    () => (id ? promiseStates.get(id) : undefined),
    () => (id ? promiseStates.get(id) : undefined),
  );
}

export type ToastPromiseMessages<T> = {
  /** While it runs: "Saving the order…". */
  loading: string;
  /** When it resolves: "Order saved", or from the result. */
  success: string | ((value: T) => string);
  /** When it rejects: "The order was not saved", or from the error. */
  error: string | ((error: unknown) => string);
  /** One line of detail under the title, kept through the change. */
  description?: string;
};

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
 * One toast for a task that takes a moment: a spinner with `loading` while the promise runs, then, in place, the
 * success or the error. A success closes after the usual time; an error stays until dismissed. Returns the same
 * promise, so the caller can still await it.
 */
function showPromise<T>(work: Promise<T> | (() => Promise<T>), messages: ToastPromiseMessages<T>): Promise<T> {
  const id = `toast-promise-${++promiseCounter}`;
  setPromiseState(id, { status: "pending", title: messages.loading, description: messages.description });
  const key = queue.add({ title: messages.loading, description: messages.description, tone: "information", pendingId: id });
  const promise = typeof work === "function" ? work() : work;
  promise.then(
    (value) => {
      const title = typeof messages.success === "function" ? messages.success(value) : messages.success;
      setPromiseState(id, { status: "success", title, description: messages.description });
      setTimeout(() => queue.close(key), DEFAULT_TIMEOUT);
    },
    (error: unknown) => {
      const title = typeof messages.error === "function" ? messages.error(error) : messages.error;
      setPromiseState(id, { status: "danger", title, description: messages.description });
    },
  );
  return promise;
}

/**
 * Shows a toast from anywhere (an event handler, a mutation callback), with no hook or provider to reach:
 * `toast("Saved")`, `toast.success("Order confirmed", { action })`, `toast.danger("Photo
 * upload failed")`. Returns the toast's key for `toast.dismiss(key)`.
 */
export const toast: ((titleOrOptions: string | ToastOptions) => string) & {
  success: ToastShortcut;
  danger: ToastShortcut;
  information: ToastShortcut;
  /** A toast that follows a promise: `toast.promise(save(), { loading, success, error })`. */
  promise: <T>(work: Promise<T> | (() => Promise<T>), messages: ToastPromiseMessages<T>) => Promise<T>;
  dismiss: (key: string) => void;
} = Object.assign((titleOrOptions: string | ToastOptions) => show(typeof titleOrOptions === "string" ? { title: titleOrOptions } : titleOrOptions), {
  success: ((title, options) => show({ ...options, title, tone: "success" })) as ToastShortcut,
  danger: ((title, options) => show({ ...options, title, tone: "danger" })) as ToastShortcut,
  information: ((title, options) => show({ ...options, title, tone: "information" })) as ToastShortcut,
  promise: showPromise,
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
      {({ toast: item }) => <ToastItem item={item} />}
    </AriaToastRegion>
  );
}


type QueuedToast = Parameters<typeof AriaToast>[0]["toast"] & { content: ToastContent; key: string };

/** One toast; a toast.promise toast reads its live state and turns its spinner into the result in place. */
function ToastItem({ item }: { item: QueuedToast }) {
  const live = usePromiseState(item.content.pendingId);
  const pending = live?.status === "pending";
  const tone: ToastTone = live ? (live.status === "pending" ? "information" : live.status) : (item.content.tone ?? "information");
  const title = live?.title ?? item.content.title;
  const description = live?.description ?? item.content.description;
  return (
    <AriaToast
      toast={item}
      data-slot="toast"
      data-tone={tone}
      data-pending={pending || undefined}
      className={cn(
        "flex w-full max-w-90 items-start gap-ds-150 rounded-ds-large bg-ds-surface-overlay p-ds-150 text-ds-text shadow-ds-overlay outline-hidden",
        "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        // Enters from below in ds-duration-medium with the enter easing (@starting-style: no keyframes needed).
        "transition-[opacity,translate] duration-(--ds-duration-medium) ease-ds-enter starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
      )}
    >
      {pending ? (
        <span aria-hidden data-slot="toast-spinner" className="mt-0.5 size-5 shrink-0 animate-spin rounded-ds-full border-2 border-ds-icon-subtle border-e-transparent motion-reduce:animate-none" />
      ) : (
        // Keyed by tone, so a toast.promise result pops in where the spinner was (no pop under reduced motion).
        <IconGlyph
          key={tone}
          name={ICON[tone].name}
          data-slot="toast-icon"
          className={cn("mt-0.5 size-5 shrink-0 transition-[scale,opacity] duration-(--ds-duration-medium) ease-ds-enter starting:scale-50 starting:opacity-0 motion-reduce:transition-none", ICON[tone].className)}
        />
      )}
      <AriaToastContent data-slot="toast-content" className="flex min-w-0 flex-1 flex-col gap-ds-025">
        <Text slot="title" data-slot="toast-title" className="text-body-strong">{title}</Text>
        {description && (
          <Text slot="description" data-slot="toast-description" className="text-body-small text-ds-text-subtle">{description}</Text>
        )}
        {/* The result of a toast.promise is said too: the region only announces a toast when it arrives. */}
        {live && !pending && (
          <span role="status" className="sr-only">
            {title}
          </span>
        )}
      </AriaToastContent>
      {item.content.action && (
        <Button
          variant="link"
          size="small"
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
