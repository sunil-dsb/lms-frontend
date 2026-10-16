import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton matching the procedure editor wizard frame (PageHeader + WizardStepper + FormSections + Floating Preview + Wizard Footer).
 * Used during route transitions and client query resolution.
 */
export function EditProcedureSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="w-full">
      {/* ── Page Header (eyebrow + title) ────────────────────────── */}
      <div className="mx-auto max-w-page">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-8 w-48 rounded-[var(--radius-md)]" />
          </div>
        </div>
      </div>

      {/* ── Stepper Bar (Sticky with full-width negative margins) ──── */}
      <div className="sticky top-[56px] z-10 -mx-4 border-b border-[var(--color-line-2)]/60 bg-[var(--color-bg-admin)]/95 px-4 py-2.5 backdrop-blur-md transition-shadow sm:-mx-6 sm:px-6 lg:top-[75px] lg:-mx-10 lg:px-10">
        <div className="mx-auto max-w-page">
          <div className="py-2">
            <div className="flex w-full items-center justify-between">
              {[
                { num: 1, labelW: "w-16", active: true },
                { num: 2, labelW: "w-12", active: false },
                { num: 3, labelW: "w-14", active: false },
                { num: 4, labelW: "w-14", active: false },
              ].map((step, idx) => (
                <React.Fragment key={step.num}>
                  <div className="flex shrink-0 items-center gap-3">
                    <Skeleton
                      className={`size-8 rounded-full ${
                        step.active
                          ? "bg-[var(--color-brand-600)] ring-4 ring-[var(--color-brand-tint)]"
                          : "bg-[var(--color-surface)] ring-1 ring-[var(--color-line-3)]"
                      }`}
                    />
                    <Skeleton
                      className={`h-4 ${step.labelW} rounded-[var(--radius-sm)] hidden sm:inline-block`}
                    />
                  </div>
                  {idx < 3 && (
                    <div className="mx-2 h-0.5 min-w-5 flex-1 rounded-full bg-[var(--color-line-2)] sm:mx-3 sm:min-w-8">
                      {idx === 0 ? (
                        <div className="h-full w-0 bg-[var(--color-brand-600)]" />
                      ) : null}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Preview Button (bottom right) ────────────────── */}
      <div className="pointer-events-none fixed bottom-[90px] right-5 z-30 lg:right-6">
        <Skeleton className="h-10 w-28 rounded-full shadow-e2" />
      </div>

      {/* ── Form Content Container ─────────────────────────────────── */}
      <div className="mx-auto max-w-page mt-4 space-y-4 pb-20">
        {/* FormSection 1: About this procedure */}
        <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <header className="flex items-start gap-3 border-b border-[var(--color-line)] pb-3">
            <Skeleton className="size-10 rounded-[var(--radius-md)] shrink-0" />
            <div className="min-w-0 flex-1 pt-1 space-y-1">
              <Skeleton className="h-5 w-44 rounded-[var(--radius-sm)]" />
            </div>
          </header>

          <div className="space-y-5 pt-1">
            {/* Title Bilingual Input */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs">
                {/* EN Field */}
                <div className="flex items-center justify-between border-b border-[var(--color-line-2)] px-3 py-2.5">
                  <Skeleton className="h-4 w-48 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-12 rounded-[var(--radius-sm)]" />
                </div>
                {/* ES Field */}
                <div className="flex items-center justify-between bg-[var(--color-wash)] px-3 py-2.5">
                  <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-12 rounded-[var(--radius-sm)]" />
                </div>
              </div>
            </div>

            {/* Purpose Bilingual Multiline */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs">
                {/* EN Multiline */}
                <div className="border-b border-[var(--color-line-2)] p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-1/2 rounded-[var(--radius-sm)]" />
                  <div className="flex justify-end pt-1">
                    <Skeleton className="h-3 w-12 rounded-[var(--radius-sm)]" />
                  </div>
                </div>
                {/* ES Multiline */}
                <div className="bg-[var(--color-wash)] p-3 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-[var(--radius-sm)]" />
                  <div className="flex justify-end pt-1">
                    <Skeleton className="h-3 w-12 rounded-[var(--radius-sm)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FormSection 2: Content */}
        <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-[var(--radius-md)] shrink-0" />
              <div className="min-w-0 pt-1 space-y-1">
                <Skeleton className="h-5 w-24 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-3.5 w-72 rounded-[var(--radius-sm)]" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </header>

          <div className="space-y-3 pt-2">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
                <Skeleton className="size-7 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full rounded-[var(--radius-sm)]" />
            </div>
          </div>
        </section>
      </div>

      {/* ── Sticky Wizard Footer ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-sticky flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 sm:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-18 rounded-[var(--radius-md)]" />
          <Skeleton className="h-9 w-18 rounded-[var(--radius-md)] bg-[var(--color-brand-600)]" />
        </div>
      </div>
    </div>
  );
}
