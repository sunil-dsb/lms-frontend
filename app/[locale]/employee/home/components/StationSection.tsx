import * as React from 'react';
import { LuBookOpen } from 'react-icons/lu';
import { ProcedureRow, type FlagLabels } from '@/components/employee/procedure-row';
import { SectionHead } from './SectionHead';
import { HomeRowsSkeleton } from './home-rows-skeleton';
import type { HomeRow } from './EmployeeHome';

/**
 * The station's own procedures (and kitchen-wide procedures the cook may read).
 * Renders a "See all" link to the full Procedures tab.
 * Wrapped in a bordered card to group rows visually (matching reference design).
 *
 * All spacing uses inline styles — Tailwind v4 resets --spacing-* so mt-x,
 * space-y-x, p-x for non-registered steps produce zero CSS.
 */
export function StationSection({
  id,
  heading,
  rows,
  flagLabels,
  all,
  empty,
  loading = false,
}: {
  id: string;
  heading: string;
  rows: HomeRow[];
  flagLabels: FlagLabels;
  all?: { href: string; label: string };
  empty?: string;
  /** Procedures query still resolving — card + heading paint, rows skeletonize. */
  loading?: boolean;
}): React.ReactElement | null {
  if (rows.length === 0 && !empty && !loading) return null;
  return (
    <section aria-labelledby={id} style={{ marginTop: '16px' }}>
      {/* Bordered card wrapping heading + rows */}
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
        style={{ padding: '14px 14px' }}
      >
        <SectionHead id={id} title={heading} all={loading ? undefined : all} />
        {loading ? (
          <HomeRowsSkeleton />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-panel)]/40 py-6 px-4 text-center mt-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink-2)]">
              <LuBookOpen className="size-4" />
            </div>
            <p className="mt-2 text-xs sm:text-sm font-medium text-[var(--color-ink-2)] max-w-sm">{empty}</p>
          </div>
        ) : (
          <ul style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        )}
      </div>
    </section>
  );
}
