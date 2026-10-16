import * as React from "react";

/**
 * Instant paint for /admin while the server dashboard resolves.
 * The home page awaits several backend reads before first paint; this
 * skeleton holds the layout (header, 4 stat cards, 2 content cards) so
 * the manager sees the screen shape immediately instead of blank.
 */
export default function AdminHomeLoading(): React.ReactElement {
  return (
    <div
      className="mx-auto max-w-page space-y-8 pb-12"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Header */}
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
        <div className="h-9 w-72 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 space-y-2"
          >
            <div className="h-4 w-20 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
            <div className="h-8 w-16 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
            <div className="h-3 w-28 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content sections */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 space-y-3"
        >
          <div className="h-5 w-48 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
          <div className="h-4 w-full rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
          <div className="h-4 w-5/6 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
          <div className="h-4 w-4/6 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
