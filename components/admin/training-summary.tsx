import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  TrainingAssignmentRow,
  TrainingAssignmentStatus,
} from "@/lib/types";

/**
 * Compact training count for a single employee on a table row:
 *
 *     7 / 10
 *
 * Just the count. The bar and the percentage live on the detail page —
 * the list row is for triage ("who needs me"), not progress at a glance.
 * The bar removed one full row of vertical space and bought nothing at
 * this density; a row with the bar tells you the same thing twice.
 *
 * Tone rule (DESIGN.md §3.3): overdue flips the label to `--bad` so the
 * row stands out in a scan — colour, not chrome, does the work.
 *
 * When `total === 0` there is nothing to train on, and a meter would be
 * invented. We render `—` in `--ink-3` instead.
 */
export function TrainingSummary({
  rows,
  className,
}: {
  rows: TrainingAssignmentRow[];
  className?: string;
}): React.ReactElement {
  const total = rows.length;
  const complete = rows.filter((r) => r.effectiveStatus === "complete").length;
  const overdue = rows.filter((r) => r.effectiveStatus === "overdue").length;

  if (total === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-sm text-[var(--color-ink-3)]",
          className,
        )}
        aria-label="No training assigned"
      >
        —
      </span>
    );
  }

  const labelTone =
    overdue > 0 ? "text-[var(--color-bad)]" : "text-[var(--color-ink-2)]";

  return (
    <span
      className={cn("tabular-nums text-sm font-medium", labelTone, className)}
      aria-label={`${complete} of ${total} training complete`}
    >
      {complete} / {total}
    </span>
  );
}

/** Same numbers, shaped for the training-overview tile on the detail page.
 *  Returns the four counts and the overall share so a single render can
 *  compose a `Meter` and a "Completed / In progress / Not started / Overdue"
 *  row. The caller decides the visual — this is a pure selector so the
 *  detail page's `getTrainingRowsForEmployee` call doesn't have to repeat
 *  the same fold twice. */
export function summariseTraining(rows: TrainingAssignmentRow[]): {
  total: number;
  complete: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  share: number;
} {
  const total = rows.length;
  const complete = rows.filter((r) => r.effectiveStatus === "complete").length;
  const overdue = rows.filter((r) => r.effectiveStatus === "overdue").length;
  const inProgress = rows.filter(
    (r) => r.effectiveStatus === "in_progress" || r.effectiveStatus === "due",
  ).length;
  // "Not started" = nothing completed yet AND not currently in progress.
  // A row whose status is `due` (assigned, no steps ticked) counts as not
  // started; a row whose status is `in_progress` does not.
  const notStarted = rows.filter(
    (r) =>
      r.effectiveStatus === "due" && r.assignment.completedStepIds.length === 0,
  ).length;
  const share = total > 0 ? Math.round((complete / total) * 100) : 0;
  return { total, complete, inProgress, notStarted, overdue, share };
}

/** Map a row's effective status to a `StatusPill` tone. Single source of
 *  truth so the list and detail page can't drift. */
export function trainingStatusTone(
  status: TrainingAssignmentStatus,
): "ok" | "progress" | "warn" | "bad" {
  switch (status) {
    case "complete":
      return "ok";
    case "in_progress":
      return "progress";
    case "due":
      return "warn";
    case "overdue":
      return "bad";
  }
}
