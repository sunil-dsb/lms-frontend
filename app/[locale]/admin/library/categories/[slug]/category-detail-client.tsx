'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubcategoryIcon } from '@/lib/category-icons';
import type { Category, Procedure, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Popover } from '@/components/ui/popover';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { LuCheck, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryDetailSkeleton } from '@/components/admin/category-detail-skeleton';
import { fetchProcedures, updateProcedureStation } from '@/services/library/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { backendSlug, categorySlugsMatch, fetchBackendSubcategories } from '@/services/categories/api';
import { useStations } from '@/services/stations/hooks';

interface CategoryDetailClientProps {
  /** The category the server saw. `null` when the category exists only in the
   *  client mock store (e.g. just-created via the Create Category modal —
   *  the backend is not running, so the server fetch misses it). */
  initialCategory: Category | null;
  /** The slug from the URL — used to look the category up client-side when
   *  the server didn't find it. */
  slug: string;
  locale: string;
  /** Manager's location — scopes the station picker options. */
  locationId: string | null;
}

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

interface StationOption {
  id: string;
  name: string;
}

/** One rendered row — a published backend procedure with its single
 *  station resolved (override → denormalised `station` → stations list). */
interface ProcedureRow {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  stationId: string | null;
  stationName: string | null;
  updatedAt: string;
}

/** Relative "Updated … ago" label from an ISO timestamp. */
function updatedAgoLabel(updatedAt: string, isEs: boolean): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000));
  if (minutes < 1) return isEs ? 'Actualizado justo ahora' : 'Updated just now';
  if (minutes < 60) return isEs ? `Actualizado hace ${minutes} min` : `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1
      ? isEs ? 'Actualizado hace 1 h' : 'Updated 1 hr ago'
      : isEs ? `Actualizado hace ${hours} h` : `Updated ${hours} hrs ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return isEs ? 'Actualizado hace 1 día' : 'Updated 1 day ago';
  if (days < 7) return isEs ? `Actualizado hace ${days} días` : `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1
      ? isEs ? 'Actualizado hace 1 sem' : 'Updated 1 wk ago'
      : isEs ? `Actualizado hace ${weeks} sem` : `Updated ${weeks} wks ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1
      ? isEs ? 'Actualizado hace 1 mes' : 'Updated 1 mo ago'
      : isEs ? `Actualizado hace ${months} meses` : `Updated ${months} mos ago`;
  }
  return isEs ? 'Actualizado hace más de un año' : 'Updated over a year ago';
}

export function CategoryDetailClient({
  initialCategory,
  slug,
  locale,
  locationId,
}: CategoryDetailClientProps): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEs = locale === 'es';
  const [category, setCategory] = React.useState<Category | null>(initialCategory);
  const [isResolving, setIsResolving] = React.useState<boolean>(initialCategory === null);
  const [notFound, setNotFound] = React.useState<boolean>(false);

  // Categories created through the modal are stored in the client mock
  // store; the server's seed fetch can't see them. On mount, if the server
  // didn't hand us a category, ask the mock store directly.
  React.useEffect(() => {
    if (initialCategory !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const { listCategories } = await import('@/lib/api');
        // locationId is not needed client-side — the mock store is location-
        // agnostic in the demo.
        const { categories } = await listCategories('loc-main');
        const match = categories.find((c) => c.slug === slug);
        if (cancelled) return;
        if (match) {
          setCategory(match);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCategory, slug]);

  const categoryId = category?.id ?? null;

  const subcategoriesQuery = useQuery({
    queryKey: ['categories', 'backend-subcategories', categoryId],
    queryFn: () => fetchBackendSubcategories(categoryId!),
    enabled: Boolean(categoryId && isUuid(categoryId)),
    staleTime: 60 * 60 * 1000,
  });
  const subcategories = React.useMemo(() => {
    const live = subcategoriesQuery.data;
    if (!live) return category?.subcategories ?? [];
    return live.map((sub) => ({
      id: sub.id,
      categoryId: sub.categoryId || categoryId || undefined,
      slug: backendSlug(sub.nameEn),
      nameEn: sub.nameEn,
      nameEs: sub.nameEs,
    }));
  }, [category?.subcategories, categoryId, subcategoriesQuery.data]);

  // Real procedures — published only, via the super_admin filter API.
  // Rows are matched to panels below by subcategory (exact id, slug, or
  // English name): backend rows never carry these mock ids, so joining on
  // ids alone would leave every panel empty.
  const proceduresQuery = useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, 'category-detail', { categoryId }],
    queryFn: () => fetchProcedures({ status: 'published' }, true).then((r) => r.procedures),
    enabled: category !== null,
    staleTime: 5000,
  });

  const stationsQuery = useStations({ locationId: locationId ?? undefined });

  const stationsById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stationsQuery.data ?? []) map.set(s.id, s.name);
    return map;
  }, [stationsQuery.data]);

  // Picker options: live stations first; when the stations query is empty,
  // fall back to the stations the loaded procedures already name.
  const stationOptions = React.useMemo<StationOption[]>(() => {
    const live = (stationsQuery.data ?? []).filter((s) => !s.isArchived);
    if (live.length > 0) {
      return [...live]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((s) => ({ id: s.id, name: s.name }));
    }
    const seen = new Map<string, string>();
    for (const p of proceduresQuery.data ?? []) {
      if (p.station && !seen.has(p.station.id)) seen.set(p.station.id, p.station.name);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [stationsQuery.data, proceduresQuery.data]);

  // Optimistic station changes, keyed by procedure id. Present while the
  // PATCH is in flight; cleared on success (refetch brings the truth) or
  // failure (row rolls back).
  const [stationOverrides, setStationOverrides] = React.useState<
    Record<string, { id: string | null; name: string | null }>
  >({});

  const toRow = React.useCallback(
    (p: Procedure): ProcedureRow => {
      const override = stationOverrides[p.id];
      const stationId =
        override !== undefined ? override.id : (p.station?.id ?? p.stationId ?? null);
      const stationName =
        override !== undefined
          ? override.name
          : (p.station?.name ?? (stationId ? stationsById.get(stationId) ?? null : null));
      return {
        id: p.id,
        slug: p.slug,
        titleEn: p.titleEn,
        titleEs: p.titleEs,
        stationId,
        stationName: stationId ? stationName : null,
        updatedAt: p.updatedAt,
      };
    },
    [stationOverrides, stationsById],
  );

  // Published, non-archived procedures grouped per subcategory panel.
  // A row belongs to a panel when its subcategory matches by exact id,
  // slug, or English name. Drafts and archived rows never reach this
  // surface.
  const normName = (s: string): string => s.trim().toLowerCase();
  const rowsBySubSlug = React.useMemo(() => {
    const map: Record<string, Procedure[]> = {};
    for (const sub of subcategories) {
      const rows = (proceduresQuery.data ?? []).filter((p) => {
        if (p.isArchived || p.status !== 'published') return false;
        const ps = (
          p as unknown as {
            subcategory?: { id: string; nameEn: string } | null;
          }
        ).subcategory;
        const pid = p.subcategoryId ?? ps?.id ?? null;
        const pname = ps?.nameEn ?? '';
        if (!pid && !pname) return false;
        return (
          (sub.id !== '' && pid !== null && sub.id === pid) ||
          (pname !== '' &&
            (categorySlugsMatch(backendSlug(pname), sub.slug) ||
              normName(pname) === normName(sub.nameEn)))
        );
      });
      rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      map[sub.slug] = rows;
    }
    return map;
  }, [proceduresQuery.data, subcategories]);

  // Default the open subcategory to the first one so the page never lands
  // fully collapsed — the manager sees what the category contains without
  // an extra click.
  const [openSubSlug, setOpenSubSlug] = React.useState<string | null>(
    subcategories[0]?.slug ?? null,
  );
  React.useEffect(() => {
    if (openSubSlug === null && subcategories.length > 0) {
      setOpenSubSlug(subcategories[0].slug);
    }
  }, [subcategories, openSubSlug]);

  // Explicit station change committed from the picker's Save button —
  // one click, one API call. `next` carries the exact value (null clears).
  function toggleStation(
    procedureId: string,
    next: { id: string | null; name: string | null },
  ): void {
    setStationOverrides((prev) => ({ ...prev, [procedureId]: next }));
    // Non-UUID rows can't go through the API — the optimistic value stands
    // as the local state.
    if (!isUuid(procedureId) || (next.id !== null && !isUuid(next.id))) return;
    void (async () => {
      try {
        await updateProcedureStation(procedureId, next.id);
      } finally {
        setStationOverrides((prev) => {
          const copy = { ...prev };
          delete copy[procedureId];
          return copy;
        });
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
      }
    })();
  }

  // Loading: the server's seed fetch missed (only client mock store has it),
  // and the client-side resolve is still running. Show a quiet pulse so the
  // user doesn't think the link was broken.
  if (isResolving) {
    return (
      <div className="mx-auto max-w-page space-y-6">
        <PageHeader
          eyebrow={isEs ? 'Categorías' : 'Categories'}
          eyebrowHref={`/${locale}/admin/library/categories`}
          title={isEs ? 'Cargando categoría…' : 'Loading category…'}
        />
        <div role="status" aria-live="polite" className="animate-pulse">
          <EmptyState compact title={isEs ? 'Cargando categoría…' : 'Loading category…'} />
        </div>
      </div>
    );
  }

  // Not found: the mock store also doesn't have a category with this slug —
  // either the row was deleted or the user opened a stale link.
  if (!category || notFound) {
    return (
      <div className="mx-auto max-w-page space-y-6">
        <PageHeader
          eyebrow={isEs ? 'Categorías' : 'Categories'}
          eyebrowHref={`/${locale}/admin/library/categories`}
          title={isEs ? 'Categoría no encontrada' : 'Category not found'}
          subtitle={
            isEs
              ? 'La categoría solicitada no existe o fue eliminada.'
              : 'The requested category does not exist or has been removed.'
          }
          actions={
            <Link href={`/${locale}/admin/library/categories`}>
              <Button variant="secondary">
                {isEs ? 'Volver a categorías' : 'Back to categories'}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const proceduresLoading = proceduresQuery.isLoading && category !== null;

  return (
    <div className="mx-auto max-w-page space-y-6">
      {/* The header every admin page wears. The eyebrow is the list this came
          from and the way back to it; no second back arrow or icon beside
          the title. The right-side action is a secondary "Back to
          categories" so the manager can leave this drilldown without
          reaching for the sidebar. */}
      <PageHeader
        eyebrow={isEs ? 'Categorías' : 'Categories'}
        eyebrowHref={`/${locale}/admin/library/categories`}
        title={isEs ? category.nameEs : category.nameEn}
        actions={
          <Link href={`/${locale}/admin/library/categories`}>
            <Button variant="secondary">
              {isEs ? 'Volver a categorías' : 'Back to categories'}
            </Button>
          </Link>
        }
      />

      {proceduresQuery.isError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-3 py-2 text-sm text-[var(--color-bad)]"
        >
          {isEs ? 'No se pudieron cargar los procedimientos.' : 'Could not load procedures.'}{' '}
          <button
            type="button"
            onClick={() => void proceduresQuery.refetch()}
            className="font-semibold underline underline-offset-2"
          >
            {isEs ? 'Reintentar' : 'Retry'}
          </button>
        </p>
      ) : null}

      {subcategories.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-ink-3)]">
          {isEs
            ? 'Esta categoría no tiene subcategorías.'
            : 'This category has no subcategories.'}
        </p>
      ) : proceduresLoading ? (
        <CategoryDetailSkeleton
          aria-label={isEs ? 'Cargando procedimientos' : 'Loading procedures'}
        />
      ) : (
        <div className="space-y-3">
          {subcategories.map((sub) => (
            <SubcategoryAccordion
              key={sub.id || sub.slug}
              category={category}
              subcategory={sub}
              procedures={(rowsBySubSlug[sub.slug] ?? []).map(toRow)}
              stations={stationOptions}
              isEs={isEs}
              isOpen={openSubSlug === sub.slug}
              onToggle={() =>
                setOpenSubSlug((prev) => (prev === sub.slug ? null : sub.slug))
              }
              onToggleStation={toggleStation}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One accordion row. The header is the clickable subcategory row; the
 *  body lists the published procedures with one station chip (or the
 *  "All stations" label for general categories) + the change-station
 *  picker. There is no Add affordance — the chip (or the "No station"
 *  pill) opens the picker and picks the single station. Mirrors the demo
 *  recipes view: aggregated stations strip lives in the header when the
 *  panel is open, per-row chip + picker live inside. */
function SubcategoryAccordion({
  category,
  subcategory,
  procedures,
  stations,
  isEs,
  isOpen,
  onToggle,
  onToggleStation,
  locale,
}: {
  category: Category;
  subcategory: Subcategory;
  procedures: ProcedureRow[];
  stations: StationOption[];
  isEs: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onToggleStation: (
    procedureId: string,
    next: { id: string | null; name: string | null },
  ) => void;
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const subNameSecondary = isEs ? subcategory.nameEn : subcategory.nameEs;
  const headerId = `sub-header-${subcategory.id || subcategory.slug}`;
  const panelId = `sub-panel-${subcategory.id || subcategory.slug}`;
  const SubIcon = getSubcategoryIcon(subcategory);

  // General categories apply to every station — the header shows one
  // "All stations" pill instead of per-station chips.
  const isGeneral = category.kind === 'general';
  // Aggregated station list — the unique set of stations the visible
  // procedures resolve to. Drawn in the header when the panel is open.
  const linkedStations = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const proc of procedures) {
      if (proc.stationId && proc.stationName && !map.has(proc.stationId)) {
        map.set(proc.stationId, proc.stationName);
      }
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [procedures]);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a, [role="menuitem"], [role="dialog"]')) {
            return;
          }
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).closest('button, a')) return;
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
          isOpen ? 'bg-[var(--color-wash)]' : 'hover:bg-[var(--color-wash)]',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <IconTile size="md" icon={SubIcon} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--color-ink)]">
              {subName}
            </h2>
            <p className="mt-0.5 truncate text-sm leading-meta text-[var(--color-ink-3)]">
              {subNameSecondary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {isOpen && (isGeneral || linkedStations.length > 0) && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-[var(--color-ink-3)] md:inline">
                {isEs ? 'Estaciones:' : 'Stations:'}
              </span>
              {isGeneral ? (
                <span className="inline-flex items-center rounded-md bg-[var(--color-brand-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-700)]">
                  {isEs ? 'Todas las estaciones' : 'All stations'}
                </span>
              ) : (
              <div className="flex flex-wrap items-center gap-2">
                {linkedStations.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center rounded-md bg-[var(--color-brand-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-700)]"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              )}
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // The wizard's Access step asks the manager to attach the
              // station — pre-filling it from this accordion would skip
              // that decision and leak the wrong station to general
              // procedures. Pass only category + subcategory; the wizard
              // applies its own default (general → all stations,
              // station-specific → none) once the manager reaches it.
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}`,
              );
            }}
            className="shrink-0 font-semibold shadow-2xs"
          >
            <LuPlus className="text-base" />
            <span>{isEs ? 'Añadir procedimiento' : 'Add procedure'}</span>
          </Button>

          <LuChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-[var(--color-ink-3)] transition-transform',
              isOpen && 'rotate-90',
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-[var(--color-line-2)] bg-[var(--color-surface)]"
        >
          {procedures.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title={
                  isEs
                    ? 'Sin procedimientos publicados aún en esta subcategoría.'
                    : 'No published procedures yet in this subcategory.'
                }
              />
            </div>
          ) : (
            <div>
              <ul className="divide-y divide-[var(--color-line)]">
                {procedures.map((proc) => (
                  <ProcedureListItem
                    key={proc.id}
                    procedure={proc}
                    stations={stations}
                    isEs={isEs}
                    isGeneral={isGeneral}
                    onToggleStation={(next) => onToggleStation(proc.id, next)}
                    onOpenProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}`)
                    }
                    onEditProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}/edit`)
                    }
                  />
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3 text-xs font-medium text-[var(--color-ink-3)]">
                <span>
                  {procedures.length} {isEs ? 'procedimientos' : 'procedures'}
                  {' · '}
                  {isGeneral ? (
                    isEs ? 'Todas las estaciones' : 'All stations'
                  ) : (
                    <>
                      {linkedStations.length}{' '}
                      {linkedStations.length === 1
                        ? isEs
                          ? 'estación enlazada'
                          : 'linked station'
                        : isEs
                          ? 'estaciones enlazadas'
                          : 'linked stations'}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One procedure row. General categories show a static "All stations"
 *  label; station-tied rows show the station chip (or the "No station"
 *  pill) which opens the change-station picker — one procedure, one
 *  station, no separate Add affordance. Kebab holds View / Edit /
 *  Change station. */
function ProcedureListItem({
  procedure,
  stations,
  isEs,
  isGeneral,
  onToggleStation,
  onOpenProcedure,
  onEditProcedure,
}: {
  procedure: ProcedureRow;
  stations: StationOption[];
  isEs: boolean;
  isGeneral: boolean;
  onToggleStation: (next: { id: string | null; name: string | null }) => void;
  onOpenProcedure: () => void;
  onEditProcedure: () => void;
}): React.ReactElement {
  const pickerTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  // Draft selection inside the picker — committed only via Save, so one
  // click never fires the API by itself.
  const [draftStationId, setDraftStationId] = React.useState<string | null>(null);

  const openPicker = (): void => {
    setDraftStationId(procedure.stationId);
    setPickerOpen(true);
  };

  const savePicker = (): void => {
    const target = stations.find((s) => s.id === draftStationId) ?? null;
    setPickerOpen(false);
    if ((target?.id ?? null) === procedure.stationId) return;
    onToggleStation(
      target ? { id: target.id, name: target.name } : { id: null, name: null },
    );
  };

  const canChangeStation = !isGeneral && stations.length > 0;
  const assignedStation =
    procedure.stationId && procedure.stationName
      ? { id: procedure.stationId, name: procedure.stationName }
      : null;

  const rowActions: RowActionItem[] = [
    {
      label: isEs ? 'Ver procedimiento' : 'View procedure',
      onSelect: onOpenProcedure,
    },
    {
      label: isEs ? 'Editar' : 'Edit',
      onSelect: onEditProcedure,
    },
    ...(canChangeStation
      ? [
          {
            label: isEs ? 'Cambiar estación' : 'Change station',
            onSelect: () => openPicker(),
          } as RowActionItem,
        ]
      : []),
  ];

  return (
    <li className="transition-colors hover:bg-[var(--color-wash)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenProcedure}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenProcedure();
            }
          }}
          className="min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] rounded-[var(--radius-sm)]"
        >
          <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
            {isEs ? procedure.titleEs : procedure.titleEn}
          </h4>
          <p className="truncate text-sm text-[var(--color-ink-2)]">
            {isEs ? procedure.titleEn : procedure.titleEs}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 pl-2" onClick={(e) => e.stopPropagation()}>
          {isGeneral ? (
            <span className="inline-flex items-center rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)] border border-[var(--color-line-2)]">
              {isEs ? 'Todas las estaciones' : 'All stations'}
            </span>
          ) : !canChangeStation ? (
            assignedStation ? (
              <span className="inline-flex items-center rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)]">
                {assignedStation.name}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md border border-dashed border-[var(--color-line-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-3)]">
                {isEs ? 'Sin estación' : 'No station'}
              </span>
            )
          ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {assignedStation ? (
              <button
                ref={pickerTriggerRef}
                type="button"
                onClick={() => openPicker()}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                aria-label={
                  isEs
                    ? `Cambiar ${assignedStation.name}`
                    : `Change ${assignedStation.name}`
                }
                className="group/chip inline-flex items-center gap-1.5 rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)] transition-colors hover:border-[var(--color-line-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {assignedStation.name}
                <LuX
                  aria-hidden="true"
                  className="text-[11px] text-[var(--color-ink-3)] transition-colors group-hover/chip:text-[var(--color-ink)]"
                />
              </button>
            ) : (
              <button
                ref={pickerTriggerRef}
                type="button"
                onClick={() => openPicker()}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                aria-label={
                  isEs ? 'Cambiar estación' : 'Change station'
                }
                className="inline-flex items-center rounded-md border border-dashed border-[var(--color-line-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {isEs ? 'Sin estación' : 'No station'}
              </button>
            )}
          </div>
          )}

          <span className="hidden text-sm leading-meta text-[var(--color-ink-3)] sm:inline">
            {updatedAgoLabel(procedure.updatedAt, isEs)}
          </span>

          <RowActions
            items={rowActions}
            triggerLabel={procedure.titleEn}
          />
        </div>
      </div>

      {canChangeStation ? (
      <Popover
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={pickerTriggerRef}
        align="end"
        side="bottom"
        width={280}
      >
        <div className="space-y-1.5 p-1">
          <p className="px-2 pt-1 text-xs font-semibold text-[var(--color-ink-3)]">
            {isEs ? 'Asignar estación' : 'Assign station'}
          </p>
          <ul className="space-y-0.5">
            {stations.map((s) => {
              const checked = draftStationId === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={checked}
                    onClick={() =>
                      // Single-select draft: picking the current pick clears
                      // it (back to no station); picking another swaps.
                      setDraftStationId((cur) => (cur === s.id ? null : s.id))
                    }
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors',
                      'hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-brand-tint)] focus-visible:outline-none',
                    )}
                  >
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {s.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex size-5 items-center justify-center rounded-full border transition-colors',
                        checked
                          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent',
                      )}
                    >
                      <LuCheck className="text-[12px]" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-2 text-[11px] text-[var(--color-ink-3)]">
            {isEs
              ? 'Selecciona una estación y guarda los cambios.'
              : 'Pick a station, then save to apply.'}
          </p>
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] px-2 py-2">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={savePicker}
              disabled={draftStationId === procedure.stationId}
              className={cn(
                'rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                draftStationId === procedure.stationId
                  ? 'cursor-not-allowed bg-[var(--color-panel-2)] text-[var(--color-ink-3)]'
                  : 'bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]',
              )}
            >
              {isEs ? 'Guardar' : 'Save'}
            </button>
          </div>
        </div>
      </Popover>
      ) : null}
    </li>
  );
}
