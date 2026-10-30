import * as React from "react";
import { TrainingFilterTabsSkeleton } from "../components/training-filter-tabs";

/**
 * Loading skeleton for the employee training page.
 * Matches the canonical max-w-doc reading column, single header block,
 * design system pill chips, and card list while the data loads.
 */
export function EmployeeTrainingLoading(): React.ReactElement {
  return (
    <main
      className="mx-auto w-full max-w-doc px-4 pt-6 sm:px-6 sm:pt-8 flex flex-col gap-5"
      style={{ paddingBottom: "140px" }}
      aria-hidden="true"
    >
      {/* Header skeleton: Title + subtitle + filter pill chips */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="animate-pulse h-7 w-44 sm:w-56 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
          <div className="animate-pulse mt-2 h-4 w-60 sm:w-80 rounded bg-[var(--color-panel)]" />
        </div>

        <TrainingFilterTabsSkeleton />
      </div>

      {/* Cards list skeleton */}
      <ul className="flex flex-col gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-48 sm:w-64 rounded bg-[var(--color-panel-2)]" />
                <div className="h-3 w-20 rounded bg-[var(--color-line-2)]" />
              </div>
              <div className="h-5 w-5 rounded bg-[var(--color-panel)]" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-[var(--color-panel)]" />
              <div className="h-3.5 w-8 rounded bg-[var(--color-panel-2)]" />
            </div>

            <div className="h-3 w-28 rounded bg-[var(--color-panel)]" />
          </li>
        ))}
      </ul>
    </main>
  );
}
