import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for the admin category detail page. Mirrors the real layout
 * exactly — PageHeader (eyebrow + title + back button), then subcategory
 * accordions (first open with procedure rows, rest collapsed) — so the swap
 * to content is a fade, not a reflow. Without this file the route inherits
 * the categories-grid skeleton from `categories/loading.tsx`.
 */
export function CategoryDetailSkeleton({
  className,
  'aria-label': ariaLabel,
  hideHeader = false,
}: {
  className?: string;
  'aria-label'?: string;
  hideHeader?: boolean;
}): React.ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label={ariaLabel ?? 'Loading category'}
      className={cn('mx-auto max-w-page space-y-6', className)}
    >
      {/* PageHeader skeleton */}
      {!hideHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-56" />
          </div>
          <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
        </div>
      ) : null}

      <div aria-hidden="true" className="space-y-3">
        {/* First accordion open, with procedure rows */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-3 bg-[var(--color-wash)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-panel)]" />
              <div className="min-w-0 space-y-1.5 overflow-hidden">
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="h-3 w-20 max-w-full bg-[var(--color-panel)]" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-8 w-28 rounded-full bg-[var(--color-brand-600)]/40" />
              <Skeleton className="size-4 rounded-full bg-[var(--color-panel)]" />
            </div>
          </div>
          <div className="border-t border-[var(--color-line-2)]">
            <ul className="divide-y divide-[var(--color-line)]">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center justify-between gap-4 overflow-hidden px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
                    <Skeleton className="h-4 w-48 max-w-full" />
                    <Skeleton className="h-3.5 w-32 max-w-full bg-[var(--color-panel)]" />
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <Skeleton className="h-6 w-20 rounded-md bg-[var(--color-panel)]" />
                    <Skeleton className="size-8 shrink-0 rounded-full bg-[var(--color-panel)]" />
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-[var(--color-line)] px-4 py-3">
              <Skeleton className="h-3 w-44 bg-[var(--color-panel)]" />
            </div>
          </div>
        </div>

        {/* Collapsed accordions */}
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-panel)]" />
              <div className="min-w-0 space-y-1.5 overflow-hidden">
                <Skeleton className="h-4 w-24 max-w-full" />
                <Skeleton className="h-3 w-16 max-w-full bg-[var(--color-panel)]" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-8 w-28 rounded-full bg-[var(--color-brand-600)]/40" />
              <Skeleton className="size-4 rounded-full bg-[var(--color-panel)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
