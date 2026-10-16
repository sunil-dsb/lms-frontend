"use client";

import * as React from "react";
import { LuCheck, LuFocus } from "react-icons/lu";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { tickStep } from "./actions";

/**
 * A course's steps, each one ticked off as it is done, so "2 of 5 steps" is
 * the reader's own count and not a number from nowhere. Big targets, because
 * the hands doing this are often wet. The tick shows at once; the record
 * follows.
 */
export function StepChecklist({
  assignmentId,
  locale,
  title,
  steps,
  initialDone,
  readOnly,
  criticalLabel,
}: {
  assignmentId: string;
  locale: string;
  title: string;
  steps: { id: string; text: string; critical?: boolean }[];
  initialDone: string[];
  /** A finished course shows its steps ticked and still. */
  readOnly?: boolean;
  /** "Critical step": the mark a step where safety is controlled keeps here. */
  criticalLabel: string;
}): React.ReactElement {
  const [done, setDone] = React.useState(() => new Set(initialDone));
  const [, start] = React.useTransition();

  function toggle(id: string): void {
    if (readOnly) return;
    const next = new Set(done);
    const on = !next.has(id);
    if (on) next.add(id);
    else next.delete(id);
    setDone(next);
    start(() => tickStep(assignmentId, id, on, locale));
  }

  return (
    <section aria-label={title}>
      <h3 className="text-lg font-semibold leading-heading text-[var(--color-ink)]">
        {title}
      </h3>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const on = done.has(s.id);
          return (
            <li key={s.id}>
              <label
                className={cn(
                  "flex min-h-tap cursor-pointer items-start gap-4 rounded-[var(--radius-lg)] border p-3 transition-colors duration-[var(--dur)] ease-[var(--ease)]",
                  on
                    ? "border-transparent bg-[var(--color-ok-tint)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-hover)]",
                  readOnly && "cursor-default",
                )}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={on}
                  disabled={readOnly}
                  onChange={() => toggle(s.id)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-ring)]",
                    on
                      ? "border-[var(--color-ok)] bg-[var(--color-ok)] text-[var(--color-surface)]"
                      : "border-[var(--color-line-3)] text-[var(--color-ink-2)]",
                  )}
                >
                  {on ? <LuCheck /> : i + 1}
                </span>
                <span
                  className={cn(
                    "flex-1 pt-2 text-base leading-body",
                    on
                      ? "text-[var(--color-ink-2)]"
                      : "text-[var(--color-ink)]",
                  )}
                >
                  {s.critical ? (
                    <StatusPill
                      tone="bad"
                      icon={LuFocus}
                      className="mb-2 font-semibold"
                    >
                      {criticalLabel}
                    </StatusPill>
                  ) : null}
                  <span className="block">{s.text}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
