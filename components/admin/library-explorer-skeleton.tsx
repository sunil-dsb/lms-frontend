import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LibraryExplorerSkeletonProps {
  className?: string;
}

/**
 * Loading state for the admin library explorer. Mirrors the real layout
 * exactly — a "Categories" label with the chip rail, the search bar with
 * the three filter selects, then one bordered, divided list of rows (icon
 * tile, title + status pill, purpose, meta line, kebab) — so the swap to
 * content is a fade, not a reflow.
 */
export function LibraryExplorerSkeleton({
  className,
}: LibraryExplorerSkeletonProps): React.ReactElement {
  return (
    <div aria-hidden="true" className={cn("space-y-6", className)}>
      {/* Categories label + chip rail */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="chip-rail -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
            {[52, 88, 96, 124, 72, 120, 80, 72].map((w, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "h-8 shrink-0 rounded-full",
                  i === 0 && "bg-[var(--color-brand-tint)]",
                )}
                // Widths echo the real chip labels so the rail settles into
                // place instead of jumping when the names land.
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      <ChipWidths />
    </div>
  );
}

/**
 * The dynamic-width pills + the rest of the frame. Kept as one component so
 * the rail widths render as pixels, and the function above stays the public
 * surface.
 */
function ChipWidths(): React.ReactElement {
  return (
    <>
      {/* Search + filter selects */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-tap-admin w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-surface)]" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-tap-admin w-28 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] sm:w-32" />
          <Skeleton className="h-tap-admin w-28 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] sm:w-32" />
          <Skeleton className="h-tap-admin w-36 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] sm:w-44" />
        </div>
      </div>

      {/* One bordered, divided list — the same container the real rows use */}
      <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-4 py-5 pl-4 pr-3">
            {/* Icon tile */}
            <Skeleton className="size-12 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-panel)]" />
            <div className="min-w-0 flex-1 space-y-2">
              {/* Title + status pill */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-5 w-16 rounded-full bg-[var(--color-panel)]" />
              </div>
              {/* Purpose */}
              <Skeleton className="h-3.5 w-2/3 bg-[var(--color-panel)]" />
              {/* Meta line */}
              <Skeleton className="h-3 w-1/2 bg-[var(--color-panel)]" />
            </div>
            {/* Kebab */}
            <Skeleton className="size-8 shrink-0 rounded-full bg-[var(--color-panel)]" />
          </li>
        ))}
      </ul>
    </>
  );
}
