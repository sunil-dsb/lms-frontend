import * as React from "react";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import {
  ProcedureRow,
  type FlagLabels,
} from "@/components/employee/procedure-row";
import { SectionHead } from "./SectionHead";
import { HomeRowsSkeleton } from "./home-rows-skeleton";
import type { HomeRow } from "./EmployeeHome";

/**
 * Limited-time promo dishes. Shows up to 3 rows on the dashboard, with a
 * "See all" link when there are more promo dishes to browse.
 *
 * All spacing uses inline styles — Tailwind v4 resets --spacing-* so mt-x,
 * space-y-x, p-x for non-registered steps produce zero CSS.
 */
export function PromoSection({
  heading,
  rows,
  empty,
  flagLabels,
  loading = false,
  all,
}: {
  heading: string;
  rows: HomeRow[];
  empty: string;
  flagLabels: FlagLabels;
  /** Procedures query still resolving — card + heading paint, rows skeletonize. */
  loading?: boolean;
  all?: { href: string; label: string } | null;
}): React.ReactElement | null {
  return (
    <section aria-labelledby="promo-h" style={{ marginTop: "24px" }}>
      {/* Bordered card wrapping heading + rows */}
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
        style={{ padding: "14px 14px" }}
      >
        <SectionHead id="promo-h" title={heading} all={all ?? undefined} />
        {loading ? (
          <HomeRowsSkeleton count={2} />
        ) : rows.length > 0 ? (
          <>
            <ul
              style={{
                marginTop: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {rows.map((r) => (
                <li key={r.key}>
                  <ProcedureRow
                    href={r.href}
                    cover={r.cover}
                    iconImageUrl={r.iconImageUrl}
                    category={r.category}
                    subcategory={r.subcategory}
                    title={r.title}
                    purpose={r.purpose}
                    meta={r.meta}
                    flags={r.flags}
                    flagLabels={flagLabels}
                    locked={r.locked}
                    lockedHref={r.lockedHref}
                    lockedReason={r.lockedReason}
                  />
                </li>
              ))}
            </ul>
            {all ? (
              <div className="mt-3 pt-2 border-t border-[var(--color-line-2)]/60 flex justify-center">
                <Link
                  href={all.href}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--color-brand-700)] hover:text-[var(--color-brand-800)]y-1 px-3 rounded-full hover:bg-[var(--color-panel)] transition-colors"
                >
                  <span>{all.label}</span>
                  <LuArrowRight className="size-3" />
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-wash)] px-3 py-3 text-sm text-[var(--color-ink-2)]">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
