import * as React from "react";

/** Skeleton shown while the procedures page resolves the session on
 *  the server; the list itself streams in behind its own skeleton
 *  once the client mounts. */
export default function ProceduresLoading(): React.ReactElement {
  return (
    <div
      className="mx-auto w-full max-w-doc px-4 pt-6 sm:px-6 sm:pt-8"
      aria-hidden="true"
    >
      <div className="animate-pulse h-8 w-44 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
      <div className="animate-pulse mt-4 h-10 w-full rounded-md border border-[var(--color-line-3)] bg-[var(--color-wash)]" />
      <div className="mt-4 flex flex-wrap gap-2">
        {[80, 110, 95, 120].map((w, i) => (
          <span
            key={i}
            className="animate-pulse h-8 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="animate-pulse flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:p-3.5 shadow-xs"
          >
            <div className="size-12 shrink-0 rounded-lg bg-[var(--color-panel-2)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 sm:w-64 rounded bg-[var(--color-panel-2)]" />
              <div className="h-3 w-32 sm:w-40 rounded bg-[var(--color-line-2)]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
