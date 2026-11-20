"use client";

import * as React from "react";
import { Button as AriaButton, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";
import {
  progressStepsLabel,
  stepDoneLabel,
  stepFailedLabel,
  stepLabel,
  stepNeedsYouLabel,
  stepNowLabel,
  stepOfLabel,
  stepsAllDoneLabel,
  stepWithProviderLabel,
} from "../i18n";

export type StepperStep = {
  id: string;
  /** The step's name ("Ek hizmetler"); a noun, one or two words. */
  label: string;
  /** Vertical only: one line under the name ("Name, price and availability"). */
  description?: string;
};

/** A step that is waiting on someone or went wrong, shown in words and an icon, never colour alone. */
export type StepStatus = "needs-you" | "with-provider" | "failed";

export type StepperProps = {
  /** Three to six steps, in order. */
  steps: readonly StepperStep[];
  /** The step the reader is on: `aria-current="step"`. Ignored with `isComplete`. */
  currentStep: string;
  /** Done steps; by default every step before the current one. Ignored with `isComplete`. */
  completedSteps?: Iterable<string>;
  /**
   * The flow is finished: every step shows its done state and none is current, so no step
   * carries `aria-current`. The list is named with the overall state ("Progress, All steps done"),
   * and the narrow one-line form reads "All steps done" over a full bar. A `stepStatus` or
   * `statusText` entry still speaks for its step, in the list and, under the done line, in the narrow form
   * too ("Domain · With us"). A finished flow cannot also have a `failed` or `needs-you` step: that
   * pairing contradicts itself and warns in development; settle the step first. Left out, nothing changes.
   */
  isComplete?: boolean;
  /** Makes done steps pressable (back to an earlier step). Leave it out where the flow cannot go back. */
  onStepPress?: (id: string) => void;
  /** `horizontal` for a flow on one page (checkout, signup); `vertical` for checklists (onboarding, setup). */
  orientation?: "horizontal" | "vertical";
  /**
   * A journey across pages (signup → payment → setup): per-step status words. With it, done and current
   * steps say so in words too.
   */
  stepStatus?: Partial<Record<string, StepStatus>>;
  /** Replaces a step's status words ("With us · 1–2 business days"). */
  statusText?: Partial<Record<string, string>>;
  /** Names the list; "Progress" by default. */
  "aria-label"?: string;
};

type State = "done" | "current" | "upcoming";

/** Per status: icon, bold fill, the text colour on that fill (its own on-colour, for contrast), words. */
const STATUS: Record<StepStatus, { icon: IconName; bar: string; on: string; text: string; words: (locale: string) => string }> = {
  "needs-you": { icon: "circle-alert", bar: "bg-ds-background-warning-bold", on: "text-ds-text-on-warning", text: "text-ds-text-warning", words: stepNeedsYouLabel },
  "with-provider": { icon: "clock", bar: "bg-ds-background-information-bold", on: "text-ds-text-on-bold", text: "text-ds-text-information", words: stepWithProviderLabel },
  failed: { icon: "circle-x", bar: "bg-ds-background-danger-bold", on: "text-ds-text-on-danger", text: "text-ds-text-danger", words: stepFailedLabel },
};

type Resolved = StepperStep & { index: number; state: State; status?: StepStatus; words?: string; icon?: IconName; hasText: boolean };

function resolve(props: StepperProps, locale: string): Resolved[] {
  const { steps, currentStep, completedSteps, stepStatus, statusText, isComplete } = props;
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));
  const done = completedSteps ? new Set(completedSteps) : new Set(steps.slice(0, currentIndex).map((step) => step.id));
  const journey = stepStatus !== undefined;
  return steps.map((step, index) => {
    const state: State = isComplete ? "done" : step.id === steps[currentIndex]?.id ? "current" : done.has(step.id) ? "done" : "upcoming";
    const status = stepStatus?.[step.id];
    const words =
      statusText?.[step.id] ??
      (status ? STATUS[status].words(locale) : journey && state === "done" ? stepDoneLabel(locale) : journey && state === "current" ? stepNowLabel(locale) : undefined);
    const icon = status ? STATUS[status].icon : journey && state === "done" ? "check" : undefined;
    return { ...step, index, state, status, words, icon, hasText: statusText?.[step.id] !== undefined };
  });
}

/**
 * Progress through an ordered flow and where the reader is in it. Horizontal: one 4px bar per step,
 * "Step 3" over the name; in a container narrower than 36rem it becomes one line ("Step 3 / 5 · Domain")
 * over a single bar, so a name never breaks letter by letter. Vertical: 24px nodes on a rail. A step's
 * status is said in words and an icon, never by colour alone. `isComplete` shows a finished flow: every
 * step done, none current.
 */
export function Stepper(props: StepperProps) {
  const { locale } = useLocale();
  const steps = resolve(props, locale);
  // A finished flow has no current step, so its currentStep is not checked.
  const unknownStep = !props.isComplete && !props.steps.some((step) => step.id === props.currentStep);
  // Once per unknown id: not on every render, nor twice under StrictMode's re-run of effects.
  const warned = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!unknownStep || warned.current === props.currentStep) return;
    warned.current = props.currentStep;
    console.warn(`Stepper: currentStep "${props.currentStep}" is not one of the steps; the first step is shown as current.`);
  }, [unknownStep, props.currentStep]);
  // A finished flow with a step still failed or waiting on the reader says two opposite things: tell the
  // developer, once per set of such steps. Development only, as Select's missing-name warning.
  const contradicted = props.isComplete
    ? steps.filter((step) => step.status === "failed" || step.status === "needs-you").map((step) => step.id).join(", ")
    : "";
  const warnedContradiction = React.useRef("");
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !contradicted || warnedContradiction.current === contradicted) return;
    warnedContradiction.current = contradicted;
    console.warn(`Stepper: isComplete with a "failed" or "needs-you" step (${contradicted}) contradicts itself; settle the step before marking the flow complete.`);
  }, [contradicted]);
  const label = props["aria-label"] ?? progressStepsLabel(locale);
  // Finished: the overall state is part of the name, which every screen reader says on entering the list.
  const name = props.isComplete ? `${label}, ${stepsAllDoneLabel(locale)}` : label;
  const complete = props.isComplete || undefined;
  return props.orientation === "vertical" ? (
    <Vertical steps={steps} name={name} onStepPress={props.onStepPress} locale={locale} label={label} complete={complete} />
  ) : (
    <Horizontal steps={steps} name={name} onStepPress={props.onStepPress} locale={locale} label={label} complete={complete} />
  );
}

type Shared = { steps: Resolved[]; name: string; onStepPress?: (id: string) => void; locale: string; label: string; complete?: true };

/** The step name: a button back to a done step when the flow allows it, plain text otherwise. */
function StepName({ step, onStepPress, className }: { step: Resolved; onStepPress?: (id: string) => void; className: string }) {
  if (step.state === "done" && onStepPress) {
    return (
      <AriaButton
        onPress={() => onStepPress(step.id)}
        data-slot="stepper-step-button"
        className={cn(className, "cursor-pointer rounded-ds-small text-start outline-hidden data-[hovered]:underline data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused")}
      >
        {step.label}
      </AriaButton>
    );
  }
  return <span className={className}>{step.label}</span>;
}

function StatusWords({ step, locale }: { step: Resolved; locale: string }) {
  // Outside a journey a done step shows only its bar or check; screen readers still hear that it is done.
  if (!step.words) return step.state === "done" ? <span className="sr-only">{`, ${stepDoneLabel(locale)}`}</span> : null;
  return (
    <span data-slot="stepper-step-status" className={cn("flex items-center gap-ds-050 text-body-small", step.status ? STATUS[step.status].text : "text-ds-text-subtlest")}>
      {step.icon && <IconGlyph name={step.icon} size="small" />}
      {step.words}
    </span>
  );
}

function Horizontal({ steps, name, label, onStepPress, locale, complete }: Shared) {
  const current = steps.find((step) => step.state === "current") ?? steps[0]!;
  const fill = complete ? 100 : ((current.index + 1) / steps.length) * 100;
  return (
    <div data-slot="stepper" data-orientation="horizontal" data-complete={complete && ""} className="@container">
      <ol aria-label={name} className="m-0 hidden list-none gap-ds-100 p-0 @min-[36rem]:flex">
        {steps.map((step) => (
          <li
            key={step.id}
            data-slot="stepper-step"
            data-state={step.state}
            data-status={step.status}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-ds-100"
          >
            <span
              aria-hidden
              data-slot="stepper-step-bar"
              className={cn(
                "h-1 rounded-ds-full",
                step.status ? STATUS[step.status].bar : step.state === "upcoming" ? "bg-ds-background-neutral-pressed" : "bg-ds-background-brand-bold",
              )}
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-body-small text-ds-text-subtlest">{stepLabel(locale, step.index + 1)}</span>
              <StepName
                step={step}
                onStepPress={onStepPress}
                className={cn(
                  "text-body [overflow-wrap:normal] [word-break:normal] hyphens-auto",
                  step.state === "current" ? "font-[600] text-ds-text" : step.state === "done" ? "font-[500] text-ds-text" : "font-[500] text-ds-text-subtle",
                )}
              />
              <StatusWords step={step} locale={locale} />
            </span>
          </li>
        ))}
      </ol>
      {/* Narrow container: where the reader is, in one line, over one bar. */}
      <div role="group" aria-label={complete ? label : name} data-slot="stepper-compact" className="flex flex-col gap-ds-100 @min-[36rem]:hidden">
        {complete ? (
          <>
            {/* Finished: no step to point at, so the line says the whole flow is done. */}
            <p data-slot="stepper-compact-done" className="m-0 flex items-center gap-ds-050 text-body font-[600] text-ds-text">
              <IconGlyph name="check" size="small" strokeWidth={3} />
              {stepsAllDoneLabel(locale)}
            </p>
            {/* A step with its own status (stepStatus or statusText) says it here too, as it does in the list. */}
            {steps
              .filter((step) => step.words && (step.status || step.hasText))
              .map((step) => (
                <p key={step.id} data-slot="stepper-compact-step-status" className="m-0 flex flex-wrap items-center gap-x-ds-050 text-body">
                  <span className="text-ds-text-subtle">{step.label}</span>
                  <span aria-hidden className="text-ds-text-subtlest">·</span>
                  <StatusWords step={step} locale={locale} />
                </p>
              ))}
          </>
        ) : (
          <p className="m-0 flex flex-wrap items-center gap-x-ds-050 text-body">
            <span className="text-ds-text-subtle">{stepOfLabel(locale, current.index + 1, steps.length)}</span>
            <span aria-hidden className="text-ds-text-subtlest">·</span>
            <span className="font-[600] text-ds-text">{current.label}</span>
            {current.words && (current.status || current.hasText) && (
              <>
                <span aria-hidden className="text-ds-text-subtlest">·</span>
                <StatusWords step={current} locale={locale} />
              </>
            )}
          </p>
        )}
        <span aria-hidden data-slot="stepper-compact-bar" className="h-1 overflow-hidden rounded-ds-full bg-ds-background-neutral-pressed">
          <span
            className={cn("block h-full rounded-ds-full", !complete && current.status ? STATUS[current.status].bar : "bg-ds-background-brand-bold")}
            style={{ width: `${fill}%` }}
          />
        </span>
      </div>
    </div>
  );
}

function Vertical({ steps, name, onStepPress, locale, complete }: Shared) {
  return (
    <ol aria-label={name} data-slot="stepper" data-orientation="vertical" data-complete={complete && ""} className="m-0 flex list-none flex-col p-0">
      {steps.map((step, i) => (
        <li
          key={step.id}
          data-slot="stepper-step"
          data-state={step.state}
          data-status={step.status}
          aria-current={step.state === "current" ? "step" : undefined}
          className="grid grid-cols-[24px_1fr] gap-ds-150"
        >
          <span className="flex flex-col items-center">
            <span
              data-slot="stepper-step-node"
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-ds-full text-[12px] font-medium",
                step.status
                  ? cn(STATUS[step.status].bar, STATUS[step.status].on)
                  : step.state === "done"
                    ? "bg-ds-background-brand-bold text-ds-text-on-brand"
                    : step.state === "current"
                      ? "bg-ds-surface-raised text-ds-text inset-ring-2 inset-ring-ds-border-selected"
                      : "bg-ds-surface-raised text-ds-text-subtle inset-ring-[1.5px] inset-ring-ds-border-bold",
              )}
            >
              {step.status ? (
                <IconGlyph name={STATUS[step.status].icon} size="small" />
              ) : step.state === "done" ? (
                <IconGlyph name="check" size="small" strokeWidth={3} />
              ) : (
                <span aria-hidden>{step.index + 1}</span>
              )}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="my-1 min-h-3 w-px flex-1 bg-ds-border" />}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 pb-ds-200">
            <StepName
              step={step}
              onStepPress={onStepPress}
              className={cn("text-body-strong", step.state === "upcoming" ? "text-ds-text-subtle" : "text-ds-text")}
            />
            {step.description && <span className="text-body-small text-ds-text-subtlest">{step.description}</span>}
            <StatusWords step={step} locale={locale} />
          </span>
        </li>
      ))}
    </ol>
  );
}
