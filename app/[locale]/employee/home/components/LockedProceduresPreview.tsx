import * as React from "react";
import {
  ProcedureRow,
  type FlagLabels,
} from "@/components/employee/procedure-row";
import { SectionHead } from "./SectionHead";
import { HomeRowsSkeleton } from "./home-rows-skeleton";
import type { HomeRow } from "./EmployeeHome";

/**
 * The two section lists rendered inside the onboarding-required home view:
 * Promo dishes and "For the X station". Every row is locked — the row still
 * shows the title/category so the cook can see what they're blocked from,
 * but tapping pushes them to /employee/training.
 */
export function LockedProceduresPreview({
  promo,
  assigned,
  station,
  lockedHref,
  lockedReason,
  flagLabels,
  loading = false,
}: {
  promo: { heading: string; rows: HomeRow[]; empty: string };
  assigned?: { heading: string; rows: HomeRow[] } | null;
  station: {
    heading: string;
    rows: HomeRow[];
    all: { href: string; label: string };
  };
  lockedHref: string;
  lockedReason: string;
  flagLabels: FlagLabels;
  /** Procedures query still resolving — headings paint, rows skeletonize. */
  loading?: boolean;
}): React.ReactElement {
  const renderLockedList = (
    id: string,
    heading: string,
    rows: HomeRow[],
    empty?: string,
    showWhenEmpty = false,
  ): React.ReactElement | null => {
    if (rows.length === 0 && !loading && !showWhenEmpty) return null;
    return (
      <section aria-labelledby={id} style={{ marginTop: "20px" }}>
        <div
          className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
          style={{ padding: "14px 14px" }}
        >
          <SectionHead id={id} title={heading} />
          {loading ? (
            <HomeRowsSkeleton />
          ) : rows.length > 0 ? (
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
                    locked={true}
                    lockedHref={lockedHref}
                    lockedReason={lockedReason}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-wash)] px-3 py-3 text-sm text-[var(--color-ink-2)]">
              {empty}
            </p>
          )}
        </div>
      </section>
    );
  };

  return (
    <>
      {renderLockedList(
        "promo-h-locked",
        promo.heading,
        promo.rows,
        promo.empty,
        true,
      )}
      {assigned
        ? renderLockedList("assigned-h-locked", assigned.heading, assigned.rows)
        : null}
      {renderLockedList("station-h-locked", station.heading, station.rows)}
    </>
  );
}
