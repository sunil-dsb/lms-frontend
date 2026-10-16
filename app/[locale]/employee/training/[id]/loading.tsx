import * as React from "react";

export default function CourseDetailLoading(): React.ReactElement {
  return (
    <main
      className="mx-auto w-full max-w-doc space-y-8 px-4 pb-20 pt-6 sm:px-6 sm:pt-8"
      aria-hidden="true"
    >
      <div className="animate-pulse h-5 w-32 rounded bg-[var(--color-panel-2)]" />

      <div className="space-y-3">
        <div className="animate-pulse h-8 w-64 sm:w-80 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
        <div className="animate-pulse h-4 w-full max-w-md rounded bg-[var(--color-panel)]" />
        <div className="animate-pulse h-6 w-24 rounded-full bg-[var(--color-panel)]" />
      </div>

      <div className="space-y-6 pt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 space-y-3"
          >
            <div className="h-4 w-40 rounded bg-[var(--color-panel-2)]" />
            <div className="h-3 w-full rounded bg-[var(--color-panel)]" />
            <div className="h-3 w-5/6 rounded bg-[var(--color-panel)]" />
          </div>
        ))}
      </div>
    </main>
  );
}
