"use client";

import * as React from "react";

/** The one size scale of the library. */
export type ComponentSize = "small" | "medium" | "large";

/**
 * How round a component's corners are: `none` square, `small` to `large` the theme's radius steps, `full` a pill
 * (Radix Themes' scale; HeroUI and Mantine have the same idea with shorter names).
 */
export type ComponentRadius = "none" | "small" | "medium" | "large" | "full";

/**
 * How much components move: `auto` (default) follows the device's "reduce motion" setting; `reduce` keeps only
 * fades and state changes, no movement; `none` turns every transition and animation off. Nothing can turn motion
 * back on for someone whose device asks for less: `auto` never overrides it.
 */
export type ComponentMotion = "auto" | "reduce" | "none";

export type ComponentDefaults = {
  /** The size every component that has one starts from; a component's own `size` wins. */
  size?: ComponentSize;
  /** The corner radius of controls and surfaces; a component's own `radius` wins. */
  radius?: ComponentRadius;
  /** Motion for every component; a component's own `motion` wins (it can still never undo the device's setting). */
  motion?: ComponentMotion;
};

const DefaultsContext = React.createContext<ComponentDefaults>({});

/** The defaults in effect here: the provider's, overridden by the nearest component that set its own. */
export function useComponentDefaults(): ComponentDefaults {
  return React.useContext(DefaultsContext);
}

/** Sets defaults for a subtree, over the ones above it (only the keys it is given). */
export function ComponentDefaultsProvider({ value, children }: { value: ComponentDefaults; children: React.ReactNode }) {
  const outer = React.useContext(DefaultsContext);
  const merged = React.useMemo(
    () => ({ size: value.size ?? outer.size, radius: value.radius ?? outer.radius, motion: value.motion ?? outer.motion }),
    [value.size, value.radius, value.motion, outer.size, outer.radius, outer.motion],
  );
  if (value.size === undefined && value.radius === undefined && value.motion === undefined) return <>{children}</>;
  return <DefaultsContext.Provider value={merged}>{children}</DefaultsContext.Provider>;
}

const RADIUS_CLASS: Record<ComponentRadius, string> = {
  none: "rounded-none",
  small: "rounded-ds-small",
  medium: "rounded-ds-medium",
  large: "rounded-ds-large",
  full: "rounded-ds-full",
};

/**
 * The class for a radius, or nothing when neither the component nor a default sets one (the component keeps its own
 * designed radius). Put it after the component's own classes: `cn` lets the later rounded class win.
 */
export function radiusClass(radius: ComponentRadius | undefined): string | undefined {
  return radius ? RADIUS_CLASS[radius] : undefined;
}

/** The component's radius: its own prop, else the default in effect. */
export function useRadius(own: ComponentRadius | undefined): ComponentRadius | undefined {
  const defaults = useComponentDefaults();
  return own ?? defaults.radius;
}

/** A field's size (small, medium or large): its own, else the default in effect. */
export function useFieldSize(own: "small" | "medium" | "large" | undefined): "small" | "medium" | "large" {
  const defaults = useComponentDefaults();
  return own ?? defaults.size ?? "medium";
}

/** Props that take a corner radius for the whole component (its frame and parts). */
export type WithRadius = {
  /** Corner radius: `none`, `small`, `medium` (the design), `large` or `full`. The provider's default otherwise. */
  radius?: ComponentRadius;
};

/** Splits `radius` off a component's props, so it reaches the frame through context and never the DOM. */
export function splitRadius<P extends WithRadius>(props: P): [ComponentRadius | undefined, Omit<P, "radius">] {
  const { radius, ...rest } = props;
  return [radius, rest];
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(listener: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(REDUCED_QUERY);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }
  media.addListener?.(listener);
  return () => media.removeListener?.(listener);
}
const deviceReducedNow = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_QUERY).matches;

/** The motion setting in effect here: the nearest component's, else the provider's, else `auto`. */
export function useMotionSetting(): ComponentMotion {
  return useComponentDefaults().motion ?? "auto";
}

/** True when this part should not move: the device asks for less, or the setting in effect is `reduce` or `none`. */
export function useReducedMotion(): boolean {
  const setting = useMotionSetting();
  const device = React.useSyncExternalStore(subscribeReduced, deviceReducedNow, () => false);
  return device || setting !== "auto";
}

/**
 * The attribute that lets the CSS follow the setting in effect, for a part rendered elsewhere in the DOM (an
 * overlay in a portal): spread it on that part's root. Empty under `auto`.
 */
export function useMotionAttribute(): { "data-ds-motion"?: ComponentMotion } {
  const setting = useMotionSetting();
  return setting === "auto" ? {} : { "data-ds-motion": setting };
}

/**
 * Sets the motion for a subtree: its CSS (through `data-ds-motion` on a layout-neutral wrapper) and its scripted
 * animations (through context). Components with a `motion` prop use it; apps can wrap any region.
 */
export function MotionScope({ motion, children }: { motion: ComponentMotion | undefined; children: React.ReactNode }) {
  if (motion === undefined) return <>{children}</>;
  return (
    <ComponentDefaultsProvider value={{ motion }}>
      <div data-ds-motion={motion} style={{ display: "contents" }}>
        {children}
      </div>
    </ComponentDefaultsProvider>
  );
}

/** Props of a component with its own motion setting. */
export type WithMotion = {
  /** `auto` (follow the device), `reduce` or `none`, for this component; the provider's setting otherwise. */
  motion?: ComponentMotion;
};
