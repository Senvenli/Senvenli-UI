"use client";

import * as React from "react";
import { Label, Meter as AriaMeter } from "react-aria-components";

import { cn } from "../utils";
import { LABEL } from "../form/styles";

export type MeterThresholds = {
  /** From here the meter warns (orange); default 85% of the maximum when the high end is the bad one. */
  warning?: number;
  /** From here it is critical (red). */
  critical?: number;
};

export type MeterProps = {
  label: React.ReactNode;
  value: number;
  maxValue: number;
  /**
   * Which end is the bad one: `high` (quota, usage; default) warns as the value grows,
   * `low` (fuel, credit left) warns as it shrinks.
   */
  badEnd?: "high" | "low";
  /** Segments in the track: 10, or the real unit count (8 for fuel eighths). */
  segments?: number;
  thresholds?: MeterThresholds;
  /**
   * "38 / 50", "460 / 500 · 92%", "1/8 · refill soon": the state in
   * words too, never colour alone. Defaults to "value / max".
   */
  valueLabel?: string;
};

type State = "normal" | "warning" | "critical";

function stateOf(value: number, maxValue: number, thresholds: MeterThresholds | undefined, badEnd: "high" | "low"): State {
  if (!(maxValue > 0)) return "normal";
  if (badEnd === "low") {
    if (thresholds?.critical !== undefined && value <= thresholds.critical) return "critical";
    return thresholds?.warning !== undefined && value <= thresholds.warning ? "warning" : "normal";
  }
  const warning = thresholds?.warning ?? maxValue * 0.85;
  if (thresholds?.critical !== undefined && value >= thresholds.critical) return "critical";
  return value >= warning ? "warning" : "normal";
}

const SEGMENT_ON: Record<State, string> = {
  normal: "bg-ds-chart-1",
  warning: "bg-ds-icon-warning",
  critical: "bg-ds-icon-danger",
};

const VALUE_TEXT: Record<State, string> = {
  normal: "text-ds-text-subtlest",
  warning: "text-ds-text-warning",
  critical: "text-ds-text-danger",
};

/**
 * A measured value against a known maximum (plan quota, fleet usage, fuel).
 * Unlike ProgressBar it does not move toward completion. The track is
 * segmented; from the warning threshold the segments turn orange, at the
 * critical one red, and the value text takes the same colour. `badEnd="low"`
 * turns it around for things that run out (fuel).
 */
export function Meter({ label, value, maxValue, segments = 10, thresholds, badEnd = "high", valueLabel }: MeterProps) {
  const state = stateOf(value, maxValue, thresholds, badEnd);
  const on = maxValue > 0 ? Math.round((Math.min(Math.max(value, 0), maxValue) / maxValue) * segments) : 0;
  return (
    <AriaMeter
      value={value}
      minValue={0}
      maxValue={maxValue}
      valueLabel={valueLabel ?? `${value} / ${maxValue}`}
      data-slot="meter"
      data-state={state}
      className="flex min-w-0 flex-col gap-ds-075"
    >
      {({ valueText }) => (
        <>
          <div data-slot="meter-head" className="flex items-baseline justify-between gap-ds-200">
            <Label data-slot="meter-label" className={LABEL}>{label}</Label>
            <span data-slot="meter-value" className={cn("text-body-small tabular-nums", VALUE_TEXT[state])}>{valueText}</span>
          </div>
          <div data-slot="meter-track" className="grid h-2 w-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}>
            {Array.from({ length: segments }, (_, index) => (
              <span
                key={index}
                data-slot="meter-segment"
                data-on={index < on || undefined}
                className={cn("rounded-ds-xsmall", index < on ? SEGMENT_ON[state] : "bg-ds-background-neutral")}
              />
            ))}
          </div>
        </>
      )}
    </AriaMeter>
  );
}
