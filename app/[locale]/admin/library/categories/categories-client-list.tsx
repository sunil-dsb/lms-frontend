'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCategories } from '@/services/categories/hooks';
import { backendSlug, categorySlugsMatch } from '@/services/categories/api';
import { fetchProcedures } from '@/services/library/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryActions } from './category-actions';
import { LuArrowRight, LuFolders } from 'react-icons/lu';
import { IconTile } from '@/components/ui/icon-tile';
import { StatusPill } from '@/components/ui/status-pill';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Categories library — single flat page.
 *
 *   ┌─ General (kind === 'general') ──────┐
 *   │  Onboarding · Food Safety · Cleaning │
 *   └──────────────────────────────────────┘
 *   ┌─ Station-specific (kind === 'station-tied') ─┐
 *   │  Hot Line · Grill · Cold Storage · Sanitation │
 *   └──────────────────────────────────────────────┘
 *   ┌─ Archived (isArchived) ────────────┐
 *   └──────────────────────────────────────┘
 *
 * Both kinds of category are immediately browseable from one scroll —
 * the previous two-panel flow asked the manager to pick a station before
 * any station-tied category would show. Now they live alongside the
 * general ones; the station filter moves to the drilldown where the
 * procedures are actually scoped by station.
 */
export function CategoriesClientList({
  initialCategories,
  locationId,
  locale,
}: {
  initialCategories: Category[];
  locationId: string | null;
  locale: string;
}): React.ReactElement {
  const { data: categories = initialCategories } = useCategories(
    locationId ?? undefined,
    true,
  );
  const isEs = locale === 'es';

  // Real procedure counts per category — published, non-archived rows via
  // the filter API (shared query cache with the library explorer). Rows
  // resolve through their denormalised category first, then through the
  // subcategory map for rows that only carry a subcategory.
  const { data: publishedProcedures = [] } = useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, 'category-counts'],
    queryFn: () => fetchProcedures({ status: 'published' }, true).then((r) => r.procedures),
    staleTime: 30_000,
  });

  // Real procedure counts per card. Backend rows link to backend
  // subcategories (or nothing), never to these mock ids — so match at
  // the subcategory level by exact id, slug, or English name instead of
  // comparing category ids (which would read 0 forever).
  const procedureCounts = React.useMemo(() => {
    const normName = (s: string): string => s.trim().toLowerCase();
    const counts = new Map<string, number>();
    for (const c of categories) {
      const subs = c.subcategories ?? [];
      let n = 0;
      if (subs.length > 0) {
        for (const p of publishedProcedures) {
          if (p.isArchived) continue;
          const ps = (
            p as unknown as {
              subcategory?: { id: string; nameEn: string } | null;
            }
          ).subcategory;
          const pid = p.subcategoryId ?? ps?.id ?? null;
          const pname = ps?.nameEn ?? '';
          if (!pid && !pname) continue;
          const hit = subs.some(
            (s) =>
              (s.id !== '' && pid !== null && s.id === pid) ||
              (pname !== '' &&
                (categorySlugsMatch(backendSlug(pname), s.slug) ||
                  normName(pname) === normName(s.nameEn))),
          );
          if (hit) n += 1;
        }
      }
      counts.set(c.id, n);
    }
    return counts;
  }, [categories, publishedProcedures]);

  const validCategories = categories.filter(
    (c) => Boolean(c && (c.nameEn?.trim() || c.nameEs?.trim())),
  );
  const active = validCategories.filter((c) => !c.isArchived);
  const archived = validCategories.filter((c) => c.isArchived);
  const generalCategories = active.filter((c) => c.kind === 'general');
  const stationTiedCategories = active.filter((c) => c.kind === 'station-tied');

  return (
    <div className="space-y-6">
      {generalCategories.length > 0 ? (
        <section aria-labelledby="general-heading" className="space-y-3">
          <h2
            id="general-heading"
            className="text-sm font-semibold text-[var(--color-ink-2)]"
          >
            {isEs ? 'General' : 'General'}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generalCategories.map((c) => (
              <li key={c.id}>
                <CategoryCard category={c} locale={locale} archivedChipLabel={null} procedureCount={procedureCounts.get(c.id) ?? 0} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stationTiedCategories.length > 0 ? (
        <section aria-labelledby="station-heading" className="space-y-3">
          <header className="space-y-1">
            <h2
              id="station-heading"
              className="text-sm font-semibold text-[var(--color-ink-2)]"
            >
              {isEs ? 'Por estación' : 'Station-specific'}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)]">
              {isEs
                ? 'Estas categorías aplican a una estación específica.'
                : 'These categories apply to a specific station.'}
            </p>
          </header>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stationTiedCategories.map((c) => (
              <li key={c.id}>
                <CategoryCard category={c} locale={locale} archivedChipLabel={null} procedureCount={procedureCounts.get(c.id) ?? 0} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-3" aria-labelledby="archived-heading">
          <header className="space-y-1">
            <h2
              id="archived-heading"
              className="text-sm font-semibold text-[var(--color-ink-2)]"
            >
              {isEs ? 'Archivadas' : 'Archived'}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)]">
              {isEs
                ? 'Ocultas de la biblioteca pero siguen asociadas a los procedimientos que las usan.'
                : 'Hidden from the library but still attached to any procedures that reference them.'}
            </p>
          </header>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <li key={c.id}>
                <CategoryCard
                  category={c}
                  locale={locale}
                  archivedChipLabel={isEs ? 'Archivada' : 'Archived'}
                  procedureCount={procedureCounts.get(c.id) ?? 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {active.length === 0 && archived.length === 0 ? (
        <EmptyCategories
          heading={isEs ? 'Aún no hay categorías' : 'No categories yet'}
        />
      ) : null}
    </div>
  );
}

/** Clickable category card. Visually identical across all sections on the
 *  page — same hover, same chrome, same `CategoryActions` kebab. Clicking
 *  lands on the real category detail page. */
function CategoryCard({
  category,
  locale,
  archivedChipLabel,
  procedureCount,
}: {
  category: Category;
  locale: string;
  archivedChipLabel: string | null;
  procedureCount: number;
}): React.ReactElement {
  const router = useRouter();
  const isEs = locale === 'es';
  const primaryName = isEs ? category.nameEs : category.nameEn;

  const handleCardClick = () => {
    router.push(`/${locale}/admin/library/categories/${category.slug}`);
  };

  const subcategories = category.subcategories ?? [];

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'group flex cursor-pointer flex-col justify-between rounded-[var(--radius-lg)] h-full min-h-[110px]',
        'border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-2xs transition-all',
        'hover:border-[var(--color-line-hover)] hover:shadow-e1',
        archivedChipLabel ? 'bg-[var(--color-wash)] opacity-75' : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <IconTile size="md" icon={getCategoryIcon(category)} className="group-hover:text-[var(--color-ink)]" />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {primaryName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {archivedChipLabel ? <StatusPill tone="neutral">{archivedChipLabel}</StatusPill> : null}
          <CategoryActions category={category} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-line)] text-sm leading-meta text-[var(--color-ink-3)]">
        <span>
          {subcategories.length}{' '}
          {isEs
            ? subcategories.length === 1
              ? 'subcategoría'
              : 'subcategorías'
            : subcategories.length === 1
              ? 'subcategory'
              : 'subcategories'}
          {' · '}
          {procedureCount}{' '}
          {isEs
            ? procedureCount === 1
              ? 'procedimiento'
              : 'procedimientos'
            : procedureCount === 1
              ? 'procedure'
              : 'procedures'}
        </span>
        <LuArrowRight aria-hidden="true" className="text-[var(--color-ink-3)] transition-transform group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}

function EmptyCategories({ heading }: { heading: string }): React.ReactElement {
  return <EmptyState icon={LuFolders} title={heading} />;
}