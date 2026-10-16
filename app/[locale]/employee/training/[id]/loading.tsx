import * as React from "react";

export default function CourseDetailLoading(): React.ReactElement {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-6 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "120px" }}
        aria-hidden="true"
      >
        {/* Back link skeleton */}
        <div className="animate-pulse h-5 w-24 rounded bg-[var(--color-panel-2)]" />

        {/* Title & subtitle skeleton */}
        <div className="space-y-2">
          <div className="animate-pulse h-8 w-56 sm:w-72 rounded-lg bg-[var(--color-panel-2)]" />
          <div className="animate-pulse h-4 w-full max-w-md rounded bg-[var(--color-panel)]" />
        </div>

        {/* Progress bar skeleton */}
        <div className="flex items-center gap-3 pt-1">
          <div className="animate-pulse h-2 flex-1 rounded-full bg-[var(--color-panel-2)]" />
          <div className="animate-pulse h-4 w-14 rounded bg-[var(--color-panel)]" />
        </div>

        {/* Chapter cards skeleton */}
        <div className="space-y-3 pt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center justify-between gap-3.5 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--color-panel-2)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4.5 w-44 rounded bg-[var(--color-panel-2)]" />
                <div className="h-3 w-32 rounded bg-[var(--color-panel)]" />
              </div>
              <div className="h-5 w-5 rounded bg-[var(--color-panel)]" />
            </div>
          ))}
        </div>

        {/* Linked procedure skeleton */}
        <div className="animate-pulse flex items-start gap-3.5 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-panel)]/30 p-4">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-[var(--color-panel-2)]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-[var(--color-panel-2)]" />
            <div className="h-4 w-40 rounded bg-[var(--color-panel)]" />
          </div>
        </div>
      </main>

      {/* Sticky Bottom Button skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-doc bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/95 to-transparent px-4 pb-6 pt-4 sm:px-6">
        <div className="animate-pulse h-[50px] w-full rounded-2xl bg-[var(--color-brand-600)]/30" />
      </div>
    </div>
  );
}
