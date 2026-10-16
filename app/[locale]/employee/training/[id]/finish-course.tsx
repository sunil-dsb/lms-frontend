"use client";

import * as React from "react";
import Link from "next/link";
import { LuCircleCheck } from "react-icons/lu";
import { Button, buttonClassName } from "@/components/ui/button";
import { finishCourse } from "./actions";

/**
 * The end of a course: tick that you read it (when the course asks for a
 * sign-off), then one clear button to finish. It used to end on a checkbox that
 * did nothing, with no way to say "I am done".
 */
export function FinishCourse({
  assignmentId,
  locale,
  needsAck,
  ackLabel,
  labels,
}: {
  assignmentId: string;
  locale: string;
  needsAck: boolean;
  /** The sign-off statement's checkbox text. */
  ackLabel: string;
  labels: { finish: string; hint: string; finished: string; back: string };
}): React.ReactElement {
  const [agreed, setAgreed] = React.useState(!needsAck);
  const [done, setDone] = React.useState(false);
  const [pending, start] = React.useTransition();

  if (done) {
    return (
      <div
        role="status"
        className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-ok-tint)] p-5"
      >
        <p className="flex items-center gap-2 text-md font-semibold text-[var(--color-ok)]">
          <LuCircleCheck aria-hidden="true" />
          {labels.finished}
        </p>
        <Link
          href={`/${locale}/employee/training`}
          className={buttonClassName({
            variant: "neutral",
            className: "min-h-tap",
          })}
        >
          {labels.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {needsAck ? (
        <label className="flex min-h-tap cursor-pointer items-start gap-3 text-base text-[var(--color-ink)]">
          <input
            type="checkbox"
            className="mt-0.5 size-6 shrink-0 accent-[var(--color-brand-600)]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="flex-1">{ackLabel}</span>
        </label>
      ) : null}
      <Button
        type="button"
        className="min-h-tap w-full"
        disabled={!agreed || pending}
        onClick={() =>
          start(async () => {
            const r = await finishCourse(assignmentId, locale);
            if (r.ok) setDone(true);
          })
        }
      >
        {labels.finish}
      </Button>
      {!agreed ? (
        <p className="text-sm text-[var(--color-ink-2)]">{labels.hint}</p>
      ) : null}
    </div>
  );
}
