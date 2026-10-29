import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Row skeletons matching the ProcedureRow shape (icon tile + title + meta)
 * for section-level streaming: the card and heading paint with real data
 * while only the rows wait on the procedures query.
 */
export function HomeRowsSkeleton({
  count = 3,
}: {
  count?: number;
}): React.ReactElement {
  return (
    <ul
      aria-hidden="true"
      style={{
        marginTop: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-xs"
        >
          <Skeleton className="size-12 shrink-0 rounded-lg bg-[var(--color-panel)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32 bg-[var(--color-panel)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
