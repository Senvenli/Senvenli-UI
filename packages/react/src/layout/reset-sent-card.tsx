"use client";

import * as React from "react";

import { Button } from "../action/button";
import { IconGlyph } from "../display/icon";
import { useCooldownAction } from "../feedback/cooldown";
import { cn } from "../utils";
import { TitleTag } from "./auth-form-layout";

export interface ResetSentLabels {
  title: React.ReactNode;
  /** Enumeration-safe body, e.g. "If an account exists we've sent a reset link." */
  description: React.ReactNode;
  resend: React.ReactNode;
  /** Resend-button label during the cooldown, e.g. `(s) => `Resend in ${s}s``. */
  resendIn?: (seconds: number) => React.ReactNode;
  /** Shown when a resend fails (the button is usable again at once), e.g. "Couldn't resend. Try again." */
  resendFailed?: React.ReactNode;
}

export interface ResetSentCardProps {
  labels: ResetSentLabels;
  /** Sends the link again. A rejected promise (or a throw) starts no wait and shows `labels.resendFailed`. */
  onResend: () => void | Promise<void>;
  /** Seconds to disable "Resend" for after each successful send. Default 60. */
  cooldownSeconds?: number;
  /**
   * The wait already running when the card appears. Default `cooldownSeconds`: the link was just sent. Pass 0 when the
   * card shows long after the send, or the server's "retry after"; a new value restarts the wait.
   */
  initialCooldown?: number;
  resending?: boolean;
  /** Optional icon in place of the default check. */
  icon?: React.ReactNode;
  /** "Back to sign in" affordance under the actions. */
  backSlot?: React.ReactNode;
  className?: string;
  /** The title's heading level: 1 by default, or 2 when the page has its own h1. */
  headingLevel?: 1 | 2 | 3;
}

/**
 * "Check your inbox" confirmation shown after a reset link is requested
 * (the auth pattern). The message is deliberately
 * enumeration-safe, and "Resend" is rate-limited by a local cooldown so it
 * can't be hammered: one send at a time, and a wait after each one that succeeds. The button shows the pending
 * state while the send runs (or while `resending`).
 */
export function ResetSentCard({
  labels,
  onResend,
  cooldownSeconds = 60,
  initialCooldown,
  resending = false,
  icon,
  backSlot,
  className,
  headingLevel = 1,
}: ResetSentCardProps) {
  const resend = useCooldownAction(onResend, cooldownSeconds, initialCooldown ?? cooldownSeconds);
  const cooling = resend.remaining > 0;
  const pending = resending || resend.isPending;

  return (
    <div data-slot="auth-card" className={cn("w-full max-w-sm", className)}>
      <div
        data-slot="reset-sent-icon"
        className="flex size-11 items-center justify-center rounded-ds-full bg-ds-background-success text-ds-text-success"
      >
        {icon ?? <IconGlyph name="circle-check" size="large" />}
      </div>

      <div className="mt-ds-300 space-y-1.5">
        <TitleTag level={headingLevel} className="text-heading-large text-ds-text">{labels.title}</TitleTag>
        <p className="text-body text-ds-text-subtle">{labels.description}</p>
      </div>

      {/* A grid stretches the button to the full width, as the old `w-full` did. */}
      <div className="mt-8 grid gap-ds-200">
        <Button
          size="large"
          isDisabled={cooling && !pending}
          isPending={pending}
          onPress={() => void resend.run()}
        >
          {!pending && cooling && labels.resendIn ? labels.resendIn(resend.remaining) : labels.resend}
        </Button>

        {resend.failed && labels.resendFailed && (
          <p role="alert" className="text-center text-body text-ds-text-danger">
            {labels.resendFailed}
          </p>
        )}

        {backSlot && <div className="flex justify-center">{backSlot}</div>}
      </div>
    </div>
  );
}
