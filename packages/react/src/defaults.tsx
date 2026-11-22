"use client";

import * as React from "react";

/** The one size scale of the library. */
export type ComponentSize = "small" | "medium" | "large";

/**
 * How round a component's corners are: `none` square, `small` to `large` the theme's radius steps, `full` a pill
 * (Radix Themes' scale; HeroUI and Mantine have the same idea with shorter names).
 */
export type ComponentRadius = "none" | "small" | "medium" | "large" | "full";

export type ComponentDefaults = {
  /** The size every component that has one starts from; a component's own `size` wins. */
  size?: ComponentSize;
  /** The corner radius of controls and surfaces; a component's own `radius` wins. */
  radius?: ComponentRadius;
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
    () => ({ size: value.size ?? outer.size, radius: value.radius ?? outer.radius }),
    [value.size, value.radius, outer.size, outer.radius],
  );
  if (value.size === undefined && value.radius === undefined) return <>{children}</>;
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

/** A field's size (fields come in small and medium): its own, else the default in effect (`large` reads as medium). */
export function useFieldSize(own: "small" | "medium" | undefined): "small" | "medium" {
  const defaults = useComponentDefaults();
  return own ?? (defaults.size === "small" ? "small" : "medium");
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
