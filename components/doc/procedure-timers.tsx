"use client";

import * as React from "react";
import { RiCloseLine, RiTimerLine } from "react-icons/ri";

/**
 * Timers that keep running while the cook moves on: the hand wash counts its 20
 * seconds, the walk-in its 30 minutes, whatever step is on the screen. They
 * are kept as the moment they end, so a reload or a closed cook mode loses
 * nothing, and the phone buzzes when one runs out.
 *
 * Per-recipe-block state lives in localStorage under
 * `lms-cook-${procedureId}-${recipeBlockId}` so a procedure with two recipe
 * blocks (e.g. a sauce + a base) keeps its own progress.
 */

export type Timer = { step: number; label: string; endsAt: number };

export type CookProgress = {
  /** Per-step "done" state, indexed by step position (0-based). */
  done: boolean[];
  /** Last step the cook was on (0 = intro, 1..N = per-step, LAST = summary). */
  at: number;
  /** Active timers for this recipe block. */
  timers: Timer[];
  /** The factor the cook was working at. */
  factor: number;
};

const EMPTY: CookProgress = { done: [], at: 0, timers: [], factor: 1 };

/** Read the persisted slot for one recipe block. Returns `null` when absent
 *  or unreadable (Safari private mode, quota, etc.) so callers can fall back. */
export function readCookProgress(
  procedureId: string,
  recipeBlockId: string,
): CookProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      `lms-cook-${procedureId}-${recipeBlockId}`,
    );
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<CookProgress>;
    return {
      done: Array.isArray(v.done) ? v.done : [],
      at: typeof v.at === "number" ? v.at : 0,
      timers: Array.isArray(v.timers) ? v.timers : [],
      factor: typeof v.factor === "number" ? v.factor : 1,
    };
  } catch {
    return null;
  }
}

export function writeCookProgress(
  procedureId: string,
  recipeBlockId: string,
  value: CookProgress,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `lms-cook-${procedureId}-${recipeBlockId}`,
      JSON.stringify(value),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** Live progress for one recipe block, hydrated on mount and re-rendered on
 *  storage events. The same hook powers the document-view trigger (so the CTA
 *  can say "Continue at step 3") and the cook-mode modal itself. */
export function useCookProgress(
  procedureId: string,
  recipeBlockId: string,
): CookProgress {
  const [state, setState] = React.useState<CookProgress>(EMPTY);
  React.useEffect(() => {
    setState(readCookProgress(procedureId, recipeBlockId) ?? EMPTY);
    const onStorage = (e: StorageEvent): void => {
      if (e.key !== `lms-cook-${procedureId}-${recipeBlockId}`) return;
      setState(readCookProgress(procedureId, recipeBlockId) ?? EMPTY);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [procedureId, recipeBlockId]);
  return state;
}

/** Just the timers slice — the dock chip watches them, the modal watches them,
 *  the trigger's `Continue at step N` ignores them. Keeping a focused hook here
 *  means a pure-timer reader doesn't have to subscribe to the whole shape. */
export function useCookTimers(
  procedureId: string,
  recipeBlockId: string,
): Timer[] {
  return useCookProgress(procedureId, recipeBlockId).timers;
}

/** The time now, once a second while there is anything to count. */
export function useNow(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remS = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(remS).padStart(2, "0")}`;
  }
  return `${m}:${String(remS).padStart(2, "0")}`;
}

export function fmtLength(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  }
  return `${Math.round(seconds / 60)} min`;
}

/**
 * The soonest timer, wherever the cook is. Running, it counts down and takes
 * the cook to its step; run out, it turns red and says so, and a tap clears it.
 */
export function TimerChip({
  timers,
  now,
  onOpen,
  onClear,
}: {
  timers: Timer[];
  now: number;
  onOpen?: (step: number) => void;
  onClear: (step: number) => void;
}): React.ReactElement | null {
  if (!timers.length) return null;
  const t = [...timers].sort((a, b) => a.endsAt - b.endsAt)[0]!;
  const over = t.endsAt <= now;
  const more = timers.length > 1 ? ` +${timers.length - 1}` : "";
  return (
    <button
      type="button"
      className="timer-chip"
      data-over={over || undefined}
      aria-label={
        over
          ? `${t.label}: time is up. Tap to clear.`
          : `${t.label}: ${fmtLeft(t.endsAt - now)} left. Tap to go to step ${t.step}.`
      }
      onClick={() => (over ? onClear(t.step) : onOpen?.(t.step))}
    >
      {over ? (
        <RiCloseLine className="i i-sm" aria-hidden="true" />
      ) : (
        <RiTimerLine className="i i-sm" aria-hidden="true" />
      )}
      <b>{over ? "Time is up" : fmtLeft(t.endsAt - now)}</b>
      <span>
        {t.label}
        {more}
      </span>
    </button>
  );
}
