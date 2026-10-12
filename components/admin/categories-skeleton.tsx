import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoriesSkeletonProps {
  className?: string;
  /** Cards in the General section — mirrors the usual 3. */
  generalCount?: number;
  /** Cards in the Station-specific section — mirrors the usual 4. */
  stationCount?: number;
}

/**
 * Loading state for the admin categories page. Mirrors the real layout
 * exactly — a section label + grid of category cards (icon tile, title,
 * kebab, divider, meta line + arrow) per section — so the swap to content
 * is a fade, not a reflow. Previously this route inherited the library
 * explorer skeleton (chip rail + search + list rows) from the parent
 * `admin/library/loading.tsx`, which looks nothing like the card grid.
 */
export function CategoriesSkeleton({
  className,
  generalCount = 3,
  stationCount = 4,
}: CategoriesSkeletonProps): React.ReactElement {
  return (
    <div aria-hidden="true" className={cn('space-y-6', className)}>
      <section className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: generalCount }).map((_, i) => (
            <li key={i}>
              <CategoryCardSkeleton />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-64" />
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: stationCount }).map((_, i) => (
            <li key={i}>
              <CategoryCardSkeleton />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * One category card placeholder. Same chrome as the real `CategoryCard` —
 * rounded-lg border, surface bg, p-4, min-h-[110px], icon tile + title +
 * kebab up top, meta line + arrow below the divider.
 */
function CategoryCardSkeleton(): React.ReactElement {
  return (
    <div className="flex h-full min-h-[110px] flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-panel)]" />
          <Skeleton className="mt-1 h-4 w-28" />
        </div>
        <Skeleton className="size-6 shrink-0 rounded-full bg-[var(--color-panel)]" />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-3">
        <Skeleton className="h-3 w-40 bg-[var(--color-panel)]" />
        <Skeleton className="size-4 shrink-0 rounded-full bg-[var(--color-panel)]" />
      </div>
    </div>
  );
}
