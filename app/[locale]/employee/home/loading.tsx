import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant paint for /employee/home while the server composes the greeting,
 * training and procedure sections. Without this, tapping Home from another
 * tab shows no skeleton at all — just a hung screen until every backend
 * read resolves. Mirrors the real layout: profile card, training card,
 * then row cards (bottom padded for the tab bar).
 */
export default function EmployeeHomeLoading(): React.ReactElement {
  return (
    <main
      className="mx-auto w-full max-w-doc px-3 pt-4 sm:px-6 sm:pt-8"
      style={{ paddingBottom: "100px" }}
    >
      <div aria-busy="true" aria-label="Loading home" className="space-y-3">
        {/* Profile card: avatar + name + role line */}
        <div
          className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs"
          style={{ padding: "14px 16px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Skeleton className="size-[42px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-48 bg-[var(--color-panel)]" />
            </div>
          </div>
        </div>

        {/* Training card */}
        <div
          className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs"
          style={{ padding: "14px 16px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Skeleton className="size-16 shrink-0 rounded-lg bg-[var(--color-panel)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28 bg-[var(--color-panel)]" />
              <Skeleton className="h-[5px] w-full rounded-full bg-[var(--color-panel)]" />
            </div>
            <Skeleton className="size-11 shrink-0 rounded-full bg-[var(--color-panel)]" />
          </div>
        </div>

        {/* Procedure rows */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
            style={{ padding: "14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Skeleton className="size-12 shrink-0 rounded-lg bg-[var(--color-panel)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-32 bg-[var(--color-panel)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
