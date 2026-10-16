import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A small inline stack of descriptive chips for "Job role", "Station", and
 * similar list cells. Distinct from the brand-tint selected chips inside
 * `MultiSelectChips` — these describe what the employee *is*, not what the
 * admin is picking.
 *
 * Shape rule (DESIGN.md §3.3): badges are rectangles, not pills. Same rule
 * applies here: rounded `var(--radius-sm)` is enough rounding to read as a
 * badge, but never enough to read as a button.
 *
 * `visibleLimit` optionally caps the rendered list — anything past it
 * collapses into a "+N" tail chip. When omitted, all items are displayed.
 */
export function ChipStack({
  items,
  visibleLimit,
  emptyText,
  className,
  /** `tone: 'role'` (default) is the neutral panel-on-ink-2 read used by
   *  job roles. `tone: 'station'` uses the same ground — kept identical
   *  for now; the prop exists so future products (access tiers, protection
   *  levels) can swap palette without changing every call site. */
  tone = "role",
}: {
  items: string[];
  visibleLimit?: number;
  emptyText?: string;
  className?: string;
  tone?: "role" | "station";
}): React.ReactElement {
  const safe = items.filter(Boolean);
  const visible =
    typeof visibleLimit === "number" ? safe.slice(0, visibleLimit) : safe;
  const overflow =
    typeof visibleLimit === "number"
      ? Math.max(0, safe.length - visibleLimit)
      : 0;

  if (safe.length === 0) {
    return (
      <span className={cn("text-sm text-[var(--color-ink-3)]", className)}>
        {emptyText ?? "—"}
      </span>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label={tone === "station" ? "Stations" : "Job roles"}
    >
      {visible.map((label, i) => (
        <span
          key={`${label}-${i}`}
          role="listitem"
          className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-panel-2)] px-2 py-0.5 text-sm font-medium text-[var(--color-ink-2)]"
        >
          {label}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          role="listitem"
          className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-panel-2)] px-2 py-0.5 text-sm font-semibold text-[var(--color-ink-2)]"
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
