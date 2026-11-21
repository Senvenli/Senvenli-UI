"use client";

import * as React from "react";

import { Button } from "../action/button";
import { IconGlyph } from "../display/icon";
import { cn } from "../utils";

export interface ResetSentLabels {
  title: React.ReactNode;
  /** Enumeration-safe body, e.g. "If an account exists we've sent a reset link." */
  description: React.ReactNode;
  resend: React.ReactNode;
  /** Resend-button label during the cooldown, e.g. `(s) => `Resend in ${s}s``. */
  resendIn?: (seconds: number) => React.ReactNode;
}

export interface ResetSentCardProps {
  labels: ResetSentLabels;
  onResend: () => void | Promise<void>;
  /** Seconds to disable "Resend" for after each send. Default 60. */
  cooldownSeconds?: number;
  resending?: boolean;
  /** Optional icon in place of the default check. */
  icon?: React.ReactNode;
  /** "Back to sign in" affordance under the actions. */
  backSlot?: React.ReactNode;
  className?: string;
}

/**
 * "Check your inbox" confirmation shown after a reset link is requested
 * (the auth pattern). The message is deliberately
 * enumeration-safe, and "Resend" is rate-limited by a local cooldown so it
 * can't be hammered. While `resending`, the button shows the DS pending state.
 */
export function ResetSentCard({
  labels,
  onResend,
  cooldownSeconds = 60,
  resending = false,
  icon,
  backSlot,
  className,
}: ResetSentCardProps) {
  const [remaining, setRemaining] = React.useState(cooldownSeconds);
  const cooling = remaining > 0;

  // One interval while cooling; decrement via a functional update so it needs no
  // per-tick re-scheduling (which wouldn't survive fake timers reliably).
  React.useEffect(() => {
    if (!cooling) return;
    const id = window.setInterval(() => {
      setRemaining((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooling]);

  async function handleResend() {
    if (cooling || resending) return;
    // Start the cooldown optimistically so the button locks before the request
    // resolves — otherwise it stays pressable during an in-flight resend when
    // the consumer doesn't drive `resending`.
    setRemaining(cooldownSeconds);
    await onResend();
  }

  return (
    <div data-slot="auth-card" className={cn("w-full max-w-sm", className)}>
      <div
        data-slot="reset-sent-icon"
        className="flex size-11 items-center justify-center rounded-ds-full bg-ds-background-success text-ds-text-success"
      >
        {icon ?? <IconGlyph name="circle-check" size="large" />}
      </div>

      <div className="mt-ds-300 space-y-1.5">
        <h1 className="text-heading-large text-ds-text">{labels.title}</h1>
        <p className="text-body text-ds-text-subtle">{labels.description}</p>
      </div>

      {/* A grid stretches the button to the full width, as the old `w-full` did. */}
      <div className="mt-8 grid gap-ds-200">
        <Button
          size="large"
          isDisabled={cooling && !resending}
          isPending={resending}
          onPress={handleResend}
        >
          {!resending && cooling && labels.resendIn ? labels.resendIn(remaining) : labels.resend}
        </Button>

        {backSlot && <div className="flex justify-center">{backSlot}</div>}
      </div>
    </div>
  );
}
