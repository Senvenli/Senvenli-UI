"use client";

import * as React from "react";
import { Label, Meter as AriaMeter, ProgressBar as AriaProgressBar } from "react-aria-components";

import { cn } from "../utils";
import { LABEL } from "../form/styles";
import { useLoop } from "./motion";

export type ProgressTone = "brand" | "success" | "danger";

const FILL: Record<ProgressTone, string> = {
  brand: "bg-ds-background-brand-bold",
  success: "bg-ds-background-success-bold",
  danger: "bg-ds-background-danger-bold",
};

const STROKE: Record<ProgressTone, string> = {
  brand: "stroke-ds-background-brand-bold",
  success: "stroke-ds-background-success-bold",
  danger: "stroke-ds-background-danger-bold",
};

export type ProgressBarProps = {
  /** What is in progress ("Importing contacts"). */
  label: React.ReactNode;
  value?: number;
  minValue?: number;
  maxValue?: number;
  /** Real units where they exist ("142 / 220", "3 / 5 steps"); defaults to the percentage. */
  valueLabel?: React.ReactNode;
  /** A task of unknown length: a 30% segment sweeps across. */
  isIndeterminate?: boolean;
  /** `success` / `danger` for a finished or failed task; pair it with a word in `valueLabel`. */
  tone?: ProgressTone;
  /** `large` (8px) for onboarding; `default` 4px. */
  size?: "default" | "large";
};

/** The sweeping segment of an indeterminate bar (Web Animations, so no global keyframes; off under reduced motion). */
function Sweep({ tone }: { tone: ProgressTone }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  // The segment is 30% of the track, so translate percentages are of the segment: it starts fully off
  // the start edge (-100%) and leaves fully past the end edge (100 / 30 ≈ 333%); mirrored in RTL.
  useLoop(
    ref,
    (direction) =>
      direction === "rtl"
        ? [{ transform: "translateX(100%)" }, { transform: "translateX(-333%)" }]
        : [{ transform: "translateX(-100%)" }, { transform: "translateX(333%)" }],
    1400,
    true,
  );
  return <span ref={ref} data-slot="progress-bar-sweep" className={cn("absolute inset-y-0 start-0 w-[30%] rounded-ds-full", FILL[tone])} />;
}

/**
 * How far a known task has gone, or that an unknown-length one is running.
 * Show it only for tasks over ~1s; shorter waits get a Spinner or nothing.
 */
export function ProgressBar({
  label, value = 0, minValue = 0, maxValue = 100, valueLabel, isIndeterminate, tone = "brand", size = "default",
}: ProgressBarProps) {
  return (
    <AriaProgressBar
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      isIndeterminate={isIndeterminate}
      valueLabel={typeof valueLabel === "string" ? valueLabel : undefined}
      data-slot="progress-bar"
      data-tone={tone}
      className="flex min-w-0 flex-col gap-ds-075"
    >
      {({ percentage, valueText }) => (
        <>
          <div data-slot="progress-bar-head" className="flex items-baseline justify-between gap-ds-200">
            <Label data-slot="progress-bar-label" className={LABEL}>{label}</Label>
            {!isIndeterminate && (
              <span
                data-slot="progress-bar-value"
                className={cn(
                  "text-body-small tabular-nums",
                  tone === "danger" ? "text-ds-text-danger" : tone === "success" ? "text-ds-text-success" : "text-ds-text-subtlest",
                )}
              >
                {valueLabel ?? valueText}
              </span>
            )}
          </div>
          <div
            data-slot="progress-bar-track"
            className={cn("relative w-full overflow-hidden rounded-ds-full bg-ds-background-neutral", size === "large" ? "h-2" : "h-1")}
          >
            {isIndeterminate ? (
              <Sweep tone={tone} />
            ) : (
              <span
                data-slot="progress-bar-fill"
                className={cn("absolute inset-y-0 start-0 rounded-ds-full transition-[width] duration-(--ds-duration-medium) ease-ds-standard motion-reduce:transition-none", FILL[tone])}
                style={{ width: `${percentage ?? 0}%` }}
              />
            )}
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}

export type ProgressCircleSize = "small" | "medium" | "large";

const CIRCLE: Record<ProgressCircleSize, { box: number; stroke: number; text: string }> = {
  small: { box: 20, stroke: 3, text: "" },
  medium: { box: 48, stroke: 4, text: "text-body-small font-medium" },
  large: { box: 80, stroke: 6, text: "text-metric-small" },
};

export type ProgressCircleProps = {
  value?: number;
  minValue?: number;
  maxValue?: number;
  /** 20px (no value text; give the value in adjacent text or a Tooltip), 48px, 80px. */
  size?: ProgressCircleSize;
  /** A visible label under the ring, or `aria-label` when there is none. */
  label?: React.ReactNode;
  "aria-label"?: string;
  isIndeterminate?: boolean;
  /** A ratio that is a measurement (doluluk, kota), not progress: announced as a meter. */
  isMeasurement?: boolean;
  tone?: ProgressTone;
  valueLabel?: string;
};

/** ProgressBar in a circle, for places with no width to spare. */
export function ProgressCircle({
  value = 0, minValue = 0, maxValue = 100, size = "medium", label, "aria-label": ariaLabel, isIndeterminate, isMeasurement, tone = "brand", valueLabel,
}: ProgressCircleProps) {
  const spec = CIRCLE[size];
  const radius = (spec.box - spec.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const spinRef = React.useRef<HTMLSpanElement>(null);
  useLoop(spinRef, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], 1000, Boolean(isIndeterminate), "linear");
  const ring = ({ percentage, valueText }: { percentage?: number; valueText?: string }) => (
    <>
      <span ref={spinRef} className="relative grid place-items-center" style={{ width: spec.box, height: spec.box }}>
        <svg aria-hidden="true" width={spec.box} height={spec.box} viewBox={`0 0 ${spec.box} ${spec.box}`} className="-rotate-90 rtl:scale-y-[-1]">
          <circle cx={spec.box / 2} cy={spec.box / 2} r={radius} fill="none" strokeWidth={spec.stroke} className="stroke-ds-background-neutral-pressed" />
          <circle
            data-slot="progress-circle-arc"
            cx={spec.box / 2}
            cy={spec.box / 2}
            r={radius}
            fill="none"
            strokeWidth={spec.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (isIndeterminate ? 0.25 : (percentage ?? 0) / 100))}
            // A round cap would still draw a dot at 0%.
            strokeOpacity={!isIndeterminate && (percentage ?? 0) === 0 ? 0 : 1}
            className={cn(STROKE[tone], "transition-[stroke-dashoffset] duration-(--ds-duration-medium) ease-ds-standard motion-reduce:transition-none")}
          />
        </svg>
        {/* The value sits in the ring from 48px up; below it moves to adjacent text. */}
        {size !== "small" && !isIndeterminate && (
          <span aria-hidden="true" data-slot="progress-circle-value" className={cn("absolute tabular-nums text-ds-text", spec.text)}>
            {valueLabel ?? valueText}
          </span>
        )}
      </span>
      {label && <Label data-slot="progress-circle-label" className="text-body-small text-ds-text-subtlest">{label}</Label>}
    </>
  );
  const common = {
    value,
    minValue,
    maxValue,
    "aria-label": label ? undefined : ariaLabel,
    valueLabel,
    "data-slot": "progress-circle",
    "data-size": size,
    className: "inline-flex flex-col items-center gap-ds-075",
  };
  // A measurement (doluluk, kota) is a meter with the same look; progress is a progressbar.
  return isMeasurement && !isIndeterminate ? (
    <AriaMeter {...common}>{ring}</AriaMeter>
  ) : (
    <AriaProgressBar {...common} isIndeterminate={isIndeterminate}>{ring}</AriaProgressBar>
  );
}
