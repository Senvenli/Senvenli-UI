// The resend pattern for a one-time code or a sign-in link, kept as example code: it is app logic, not a
// design-system part. Copy it into your app and adapt it.
import * as React from "react";

export type CooldownAction = {
  /** Runs the action; the cooldown starts only after it succeeds. */
  run: () => Promise<boolean>;
  /** Seconds left before the action is available again. */
  remaining: number;
  /** True while the action is running. */
  isPending: boolean;
  /** True after the last run failed (cleared by the next run). */
  failed: boolean;
};

/**
 * The resend pattern (code again, link again): a rejected or throwing action
 * never starts the wait and never escapes as an unhandled rejection
 *; a successful one starts `seconds` of cooldown. `initial` is
 * the wait already running (a code was just sent); a new value restarts it.
 */
export function useCooldownAction(action: (() => unknown) | undefined, seconds: number, initial = 0): CooldownAction {
  const [remaining, setRemaining] = React.useState(initial);
  const [isPending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const latest = React.useRef(action);
  latest.current = action;
  const running = React.useRef(false);
  const remainingRef = React.useRef(remaining);
  remainingRef.current = remaining;

  // A new initial wait from the parent (a server "retry after") restarts the wait.
  const firstInitial = React.useRef(true);
  React.useEffect(() => {
    if (firstInitial.current) {
      firstInitial.current = false;
      return;
    }
    setRemaining(initial);
  }, [initial]);

  // One interval for the whole wait, counting down with a functional update: no per-tick rescheduling, so a long jump
  // of the clock (a backgrounded tab, fake timers) still lands on the right second.
  const cooling = remaining > 0;
  React.useEffect(() => {
    if (!cooling) return;
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooling]);

  const run = React.useCallback(async () => {
    // One run at a time, and none while the wait is on.
    if (!latest.current || running.current || remainingRef.current > 0) return false;
    running.current = true;
    setPending(true);
    setFailed(false);
    try {
      await latest.current();
      setRemaining(seconds);
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      running.current = false;
      setPending(false);
    }
  }, [seconds]);

  return { run, remaining, isPending, failed };
}
