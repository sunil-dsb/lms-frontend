import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the admin procedure detail page
 * (`/admin/library/[id]`). Mirrors the real `AdminProcedureView` frame —
 * top chrome bar, doc head (icon tile + category + title), allergen
 * banner, purpose lines, Yield section (pills + facts grid) and body
 * blocks — so the swap to content is a fade, not a reflow.
 *
 * Used in two places for the same route: the route `loading.tsx`
 * (server-side, while the session resolves) and the client
 * `AdminProcedureDetailLoader` (cold open with no browse cache).
 */
export function AdminProcedureDetailSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-doc space-y-6">
      {/* Top chrome bar: back link left, Start cooking + Edit + kebab right */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-24 rounded-[var(--radius-md)]" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-full bg-[var(--color-brand-600)]/30" />
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      {/* Doc head: icon tile + category + title */}
      <div className="space-y-3 pt-2">
        <Skeleton className="size-12 rounded-[var(--radius-md)]" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-3/5 rounded-[var(--radius-md)]" />
      </div>

      {/* Allergen banner */}
      <Skeleton className="h-24 w-full rounded-[var(--radius-lg)] bg-[var(--color-warn-tint)]" />

      {/* Purpose lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full bg-[var(--color-panel)]" />
        <Skeleton className="h-4 w-2/3 bg-[var(--color-panel)]" />
      </div>

      {/* Yield section: heading + batch pills + facts grid */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-24 rounded-[var(--radius-md)]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-14 rounded-full" />
          <Skeleton className="h-10 w-14 rounded-full" />
          <Skeleton className="h-10 w-14 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-16 w-full rounded-[var(--radius-md)] bg-[var(--color-panel)]"
            />
          ))}
        </div>
      </div>

      {/* Body blocks: numbered steps */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 rounded-[var(--radius-md)]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-full bg-[var(--color-panel)]" />
              <Skeleton className="h-4 w-2/3 bg-[var(--color-panel)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
