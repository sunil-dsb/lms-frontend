'use client';

import * as React from 'react';
import { queryWords, scoreProcedure } from '@/lib/procedure-search';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackendCategories } from '@/services/categories/hooks';
import { backendSlug, categorySlugsMatch } from '@/services/categories/api';
import { useAssignedProcedures } from '@/services/library/hooks';
import { getCategoryIcon } from '@/lib/category-icons';
import { Icon } from '@/components/ui/icon';
import type { Category, Procedure } from '@/lib/types';
import { withAs, type ViewAs } from '@/lib/view-as';
import { LuSearch, LuBookOpen, LuInbox, LuFolderX, LuRotateCcw } from 'react-icons/lu';
import { ProcedureRow } from '@/components/employee/procedure-row';
import { allergenWords, factsOf } from '@/app/[locale]/employee/home/components/procedure-facts';

interface ProceduresClientListProps {
  initialQuery: string;
  initialCategory: string;
  locationId: string;
  locale: string;
  readsSpanish: boolean;
  /** Forwarded to each row's href so the chosen chrome rides along navigations. */
  viewAs: ViewAs | null;
  /** The reader's station: its own procedures lead the list. */
  stationId?: string | null;
  /** All of the reader's stations (preferred over stationId when present). */
  stationIds?: string[];
  /** The reader's id: drives the "Assigned to me" filter (assignUsers). */
  employeeId?: string;
  /** When true, every row is rendered as locked (dimmed + dashed + tap →
   *  /employee/training). Default false — onboarding has been cleared. */
  locked?: boolean;
  /** Where locked rows route on tap (typically /employee/training). */
  lockedHref?: string;
  /** Localised reason string rendered below each locked row's meta line. */
  lockedReason?: string;
}

export function ProceduresClientList({
  initialQuery,
  initialCategory,
  locale,
  readsSpanish,
  viewAs,
  stationId,
  stationIds,
  employeeId,
  locked,
  lockedHref,
  lockedReason,
}: ProceduresClientListProps): React.ReactElement {
  // Translations must be resolved inside the client: next-intl's translation
  // object contains function values for interpolated keys, and those cannot be
  // serialised across the server→client boundary.
  const tBrowse = useTranslations('employee.browse');
  const tHome = useTranslations('employee.home');

  const labels = {
    all: tBrowse('all'),
    myStation: tBrowse('myStation'),
    assignedToMe: tBrowse('assignedToMe'),
    count: (c: number) => tBrowse('count', { count: c }),
    none: tBrowse('none'),
    noneFor: (q: string) => tBrowse('noneFor', { query: q }),
    searchPlaceholder: tBrowse('searchPlaceholder'),
    searchLabel: tBrowse('searchLabel'),
    uncategorised: tBrowse('uncategorised'),
  };

  const flagLabels = {
    allergen: (list: string) => tHome('flagAllergen', { list }),
    critical: tHome('flagCritical'),
    english: tHome('flagEnglishOnly'),
  };

  const [query, setQuery] = React.useState<string>(initialQuery);
  const [activeCategory, setActiveCategory] = React.useState<string>(initialCategory);
  const [scope, setScope] = React.useState<'' | 'assigned'>('');

  const [debouncedQuery, setDebouncedQuery] = React.useState(query);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Categories resolve through TanStack Query (1-hour cache for categories so
  // tab-back navigation is instant and no redundant API calls are made).
  // Backend only — no mock merge.
  const queryClient = useQueryClient();
  const { data: backendCategories = [] } = useBackendCategories();
  const categories = React.useMemo(() => {
    const merged: Category[] = [];
    for (const c of backendCategories) {
      const slug = c.slug || backendSlug(c.nameEn);
      const dup = merged.find(
        (m) => categorySlugsMatch(m.slug, slug) || (Boolean(m.id) && Boolean(c.id) && m.id === c.id),
      );
      if (!dup) merged.push({ ...c, slug });
    }
    return merged;
  }, [backendCategories]);

  const selectedCategoryObj = React.useMemo(
    () =>
      categories.find(
        (c) =>
          c.id === activeCategory ||
          c.slug === activeCategory ||
          categorySlugsMatch(c.slug, activeCategory),
      ),
    [categories, activeCategory],
  );

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const categoryUuid =
    selectedCategoryObj?.id && uuidRegex.test(selectedCategoryObj.id)
      ? selectedCategoryObj.id
      : activeCategory && uuidRegex.test(activeCategory)
        ? activeCategory
        : undefined;

  const assignedProceduresQuery = useAssignedProcedures({
    scope: scope === 'assigned' ? 'mine' : 'all',
    categoryId: categoryUuid,
    search: debouncedQuery.trim() || undefined,
    limit: 100,
  });

  const procedures = assignedProceduresQuery.data?.procedures ?? [];
  const proceduresLoading = assignedProceduresQuery.isLoading;

  // Keep the list fresh when another tab (or the admin library)
  // mutates the on-device stores.
  React.useEffect(() => {
    const syncData = () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['procedures', 'browse'] });
    };
    window.addEventListener('storage', syncData);
    window.addEventListener('lms_categories_updated', syncData);
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('lms_categories_updated', syncData);
    };
  }, [queryClient]);

  const isEs = locale === 'es';
  const titleOf = (p: Procedure): string => (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs);
  const purposeOf = (p: Procedure): string => (isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs) || '';
  const nameOf = (c: Category): string => (isEs ? c.nameEs || c.nameEn : c.nameEn || c.nameEs);

  const coverOf = (p: Procedure): string | undefined => {
    const body = p.bodyEn?.blocks?.length ? p.bodyEn : p.bodyEs;
    if (!body?.blocks) return undefined;
    for (const b of body.blocks) if (b.kind === 'image' && b.src) return b.src;
    return undefined;
  };

  // A question, not a title: matched word by word through everything a
  // procedure says, best answers first (see lib/procedure-search).
  // With no question, the reader's own station leads, then A to Z.
  const words = queryWords(query);
  const myStationIds = stationIds && stationIds.length > 0 ? stationIds : stationId ? [stationId] : [];
  const mine = (p: Procedure): number =>
    p.isStationProcedure ||
    (myStationIds.length > 0 &&
      ((p.stationScope?.mode === 'specific' && p.stationScope.stationIds.some((id) => myStationIds.includes(id))) ||
        (p.station?.id && myStationIds.includes(p.station.id)) ||
        (p.audience?.mode === 'some' && p.audience.stationIds.some((id) => myStationIds.includes(id)))))
      ? 1
      : 0;
  const assignedToMe = (p: Procedure): boolean =>
    p.isDirectlyAssigned === true || Boolean(employeeId && p.assignUsers?.includes(employeeId));
  const published = procedures.filter((p) => p.status === 'published' && !p.isArchived);
  const results = published
    .filter((p) => {
      if (!activeCategory) return true;
      if (categoryUuid) return true;
      return (
        p.category?.slug === activeCategory ||
        p.category?.id === activeCategory ||
        categorySlugsMatch(p.category?.slug, activeCategory)
      );
    })
    .filter((p) => (scope === 'assigned' ? assignedToMe(p) : true))
    .map((p) => ({ p, score: query.trim() ? scoreProcedure(p, words) : 1 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      // Prioritize Guacamole Fresco at the top when no specific text search is active
      const isGuacA = a.p.id === 'proc-guacamole-fresco' || a.p.slug === 'guacamole-fresco' ? 1 : 0;
      const isGuacB = b.p.id === 'proc-guacamole-fresco' || b.p.slug === 'guacamole-fresco' ? 1 : 0;
      if (!query.trim() && isGuacA !== isGuacB) {
        return isGuacB - isGuacA;
      }
      return (
        b.score - a.score ||
        mine(b.p) - mine(a.p) ||
        new Date(b.p.updatedAt || b.p.createdAt).getTime() - new Date(a.p.updatedAt || a.p.createdAt).getTime() ||
        titleOf(a.p).localeCompare(titleOf(b.p), locale)
      );
    })
    .map((r) => r.p);

  /* All chip sizing uses inline styles — Tailwind v4 resets --spacing-* so gap-x, px-x classes produce no CSS */
  const chipBase = 'inline-flex items-center rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 text-xs';
  const chipStyle = { height: '30px', minHeight: '30px', paddingLeft: '10px', paddingRight: '10px', gap: '4px' };
  const chipStyleSm = { ...chipStyle }; // same for now, can scale up with sm: breakpoint if needed

  return (
    <div>
      {/* Search Input — compact on mobile to leave room for filter chips below */}
      <div className="mt-4">
        <label htmlFor="q-client" className="sr-only">
          {labels.searchLabel}
        </label>
        <div
          className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line-3)] bg-[var(--color-surface)] px-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] focus-within:border-[var(--color-ring)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-ring)] sm:px-4"
          style={{ height: '40px' }}
        >
          <LuSearch aria-hidden="true" className="shrink-0 text-base text-[var(--color-ink-2)] sm:text-lg" />
          <input
            id="q-client"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {proceduresLoading && procedures.length === 0 ? (
        <ProceduresListSkeleton />
      ) : (
        <>
          {/* Category filter chips — always wrap, all visible without scrolling */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('');
                  setScope('');
                }}
                className={`${chipBase} ${activeCategory === '' && scope === '' ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
                style={chipStyle}
              >
                {labels.all}
              </button>
              {employeeId ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('');
                    setScope(scope === 'assigned' ? '' : 'assigned');
                  }}
                  className={`${chipBase} ${scope === 'assigned' ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
                  style={chipStyle}
                >
                  {labels.assignedToMe}
                </button>
              ) : null}
              {categories
                .filter((c) => !c.isArchived)
                .map((c) => {
                  const on =
                    (activeCategory === c.slug ||
                      (c.id && activeCategory === c.id) ||
                      categorySlugsMatch(activeCategory, c.slug)) &&
                    scope === '';
                  return (
                    <button
                      type="button"
                      key={c.id || c.slug}
                      onClick={() => {
                        setScope('');
                        setActiveCategory(on ? '' : c.slug || c.id);
                      }}
                      className={`${chipBase} ${on ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]'}`}
                      style={chipStyle}
                    >
                      <Icon icon={getCategoryIcon(c)} />
                      {nameOf(c)}
                    </button>
                  );
                })}
            </div>
          </div>

          <p className="mt-4 text-sm text-[var(--color-ink-2)]" aria-live="polite">
            {labels.count(results.length)}
          </p>

          {results.length === 0 ? (
            <EmptyProceduresCard
              hasFilter={Boolean(query.trim() || activeCategory || scope)}
              hasQuery={Boolean(query.trim())}
              hasCategory={Boolean(activeCategory)}
              hasScope={scope === 'assigned'}
              categoryName={selectedCategoryObj ? nameOf(selectedCategoryObj) : undefined}
              onReset={() => {
                setQuery('');
                setActiveCategory('');
                setScope('');
              }}
              onClearCategory={() => setActiveCategory('')}
              onClearScope={() => setScope('')}
              isEs={isEs}
              noneForText={labels.noneFor(query.trim())}
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {results.map((p) => {
                const cover = p.procedureImage || coverOf(p);
                const sub = p.subcategoryId
                  ? p.category?.subcategories?.find((s) => s.id === p.subcategoryId) ?? null
                  : (p as any).subcategory ?? null;
                return (
                  <li key={p.id}>
                    <ProcedureRow
                      href={withAs(`/${locale}/procedures/${p.slug}`, viewAs)}
                      cover={cover}
                      iconImageUrl={p.iconImageUrl ?? p.procedureImage ?? null}
                      category={p.category}
                      subcategory={sub}
                      title={titleOf(p)}
                      purpose={purposeOf(p)}
                      meta={p.category ? nameOf(p.category) : labels.uncategorised}
                      flags={{
                        ...factsOf(p, readsSpanish),
                        allergens: allergenWords(factsOf(p, readsSpanish).allergens, isEs ? 'es' : 'en'),
                      }}
                      flagLabels={flagLabels}
                      locked={locked}
                      lockedHref={lockedHref}
                      lockedReason={lockedReason}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** First-paint placeholder while the procedures query resolves —
 *  chip row + five blank rows, pulsing. */
function ProceduresListSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="mt-3 space-y-4">
      <div className="flex flex-wrap gap-2">
        {[80, 110, 95, 120].map((w, i) => (
          <span
            key={i}
            className="animate-pulse h-8 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <ul className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="animate-pulse flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:p-3.5 shadow-xs"
          >
            <div className="size-12 shrink-0 rounded-lg bg-[var(--color-panel-2)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 sm:w-64 rounded bg-[var(--color-panel-2)]" />
              <div className="h-3 w-32 sm:w-40 rounded bg-[var(--color-line-2)]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyProceduresCard({
  hasFilter,
  hasQuery,
  hasCategory,
  hasScope,
  categoryName,
  onReset,
  onClearCategory,
  onClearScope,
  isEs,
  noneForText,
}: {
  hasFilter: boolean;
  hasQuery: boolean;
  hasCategory: boolean;
  hasScope: boolean;
  categoryName?: string;
  onReset: () => void;
  onClearCategory: () => void;
  onClearScope: () => void;
  isEs: boolean;
  noneForText: string;
}): React.ReactElement {
  const icon = hasQuery ? (
    <LuSearch className="size-8 text-[var(--color-ink-2)]" />
  ) : hasScope ? (
    <LuInbox className="size-8 text-[var(--color-ink-2)]" />
  ) : hasCategory ? (
    <LuFolderX className="size-8 text-[var(--color-ink-2)]" />
  ) : (
    <LuBookOpen className="size-8 text-[var(--color-ink-2)]" />
  );

  let title = isEs ? 'No se encontraron procedimientos' : 'No procedures found';
  if (hasQuery) {
    title = isEs ? 'Sin resultados de búsqueda' : 'No matching procedures';
  } else if (hasScope) {
    title = isEs ? 'Sin procedimientos asignados a ti' : 'No procedures directly assigned';
  } else if (hasCategory && categoryName) {
    title = isEs ? `Sin procedimientos en ${categoryName}` : `No procedures in ${categoryName}`;
  } else if (!hasFilter) {
    title = isEs ? 'No hay procedimientos disponibles' : 'No procedures assigned yet';
  }

  let body = isEs
    ? 'Los procedimientos asignados a tu estación aparecerán aquí cuando tu gerente los publique.'
    : 'Procedures assigned to your station will appear here once published by your manager.';
  if (hasQuery) {
    body = noneForText;
  } else if (hasScope) {
    body = isEs
      ? 'No tienes procedimientos asignados directamente de forma individual. Puedes explorar los procedimientos disponibles para tu estación con el botón de abajo.'
      : 'You have no individual procedures directly assigned to you. You can browse all procedures available for your station.';
  } else if (hasCategory) {
    body = isEs
      ? 'Actualmente no hay procedimientos publicados bajo esta categoría para tu estación.'
      : 'There are currently no procedures in this category assigned to your station.';
  }

  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-12 text-center sm:px-12 sm:py-16 shadow-xs transition-all">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-inner">
        {icon}
      </div>

      <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)] sm:text-xl">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm text-[var(--color-ink-2)] leading-relaxed">
        {body}
      </p>

      {hasFilter ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2 text-xs font-semibold text-[var(--color-surface)] shadow-xs transition hover:opacity-90 cursor-pointer"
          >
            <LuRotateCcw className="size-3.5" />
            {isEs ? 'Restablecer todos los filtros' : 'Clear all filters'}
          </button>
          {hasScope ? (
            <button
              type="button"
              onClick={onClearScope}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-panel-2)] cursor-pointer"
            >
              {isEs ? 'Ver procedimientos de estación' : 'Browse station procedures'}
            </button>
          ) : null}
          {hasCategory ? (
            <button
              type="button"
              onClick={onClearCategory}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-panel-2)] cursor-pointer"
            >
              {isEs ? 'Ver todas las categorías' : 'View all categories'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

