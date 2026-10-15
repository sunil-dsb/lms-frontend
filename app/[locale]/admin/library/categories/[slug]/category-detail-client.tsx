'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubcategoryIcon } from '@/lib/category-icons';
import type { Category, Procedure, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { BilingualInput, type BilingualValue } from '@/components/ui/bilingual-input';
import { IconTile } from '@/components/ui/icon-tile';
import { Popover } from '@/components/ui/popover';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { LuCheck, LuChevronDown, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { Label } from '@/components/ui/label';
import { CategoryDetailSkeleton } from '@/components/admin/category-detail-skeleton';
import { fetchProcedures, updateProcedureStation } from '@/services/library/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { backendSlug, categorySlugsMatch, createBackendSubcategory, fetchBackendCategories, fetchBackendSubcategories } from '@/services/categories/api';
import { AVAILABLE_ICONS } from '../category-actions';
import { ProcedureListItem, SubcategoryAccordion } from './category-detail-rows';
import type { ProcedureRow, StationOption } from './category-detail-rows';
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
  const [addSubcategoryOpen, setAddSubcategoryOpen] = React.useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = React.useState<BilingualValue>({ en: '', es: '' });
  const [newSubcategoryIcon, setNewSubcategoryIcon] = React.useState('folder');
  const [showSubcategoryIconPicker, setShowSubcategoryIconPicker] = React.useState(false);
  const [creatingSubcategory, setCreatingSubcategory] = React.useState(false);
  const [subcategoryError, setSubcategoryError] = React.useState<string | null>(null);

  // If the server did not resolve the category, retry against the backend
  // category API instead of filling this page from demo data.
  React.useEffect(() => {
    if (initialCategory !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const categories = await fetchBackendCategories({ page: 1, limit: 200 });
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
  const canFetchSubcategories = Boolean(categoryId && isUuid(categoryId));

  const subcategoriesQuery = useQuery({
    queryKey: ['categories', 'backend-subcategories', categoryId],
    queryFn: () => fetchBackendSubcategories(categoryId!),
    enabled: canFetchSubcategories,
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

  const isSubcategoriesLoading =
    isResolving ||
    (canFetchSubcategories && (
      subcategoriesQuery.isPending ||
      subcategoriesQuery.isLoading ||
      (subcategoriesQuery.isFetching && (!subcategoriesQuery.data || subcategories.length === 0)) ||
      subcategoriesQuery.data === undefined
    ));

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

  const showSkeleton =
    isSubcategoriesLoading ||
    (proceduresQuery.isLoading && subcategories.length === 0);

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
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
        .map((s) => ({ id: s.id, name: s.name }));
    }
    const seen = new Map<string, string>();
    for (const p of proceduresQuery.data ?? []) {
      if (p.station && !seen.has(p.station.id)) seen.set(p.station.id, p.station.name);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [stationsQuery.data, proceduresQuery.data]);

  // Optimistic station changes, keyed by procedure id.
  const [stationOverrides, setStationOverrides] = React.useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});

  const toRow = React.useCallback(
    (p: Procedure): ProcedureRow => {
      const override = stationOverrides[p.id];
      let rowStations: Array<{ id: string; name: string }> = [];

      if (override !== undefined) {
        rowStations = override;
      } else {
        const rawIds: string[] =
          Array.isArray(p.stationScope?.stationIds) && p.stationScope.stationIds.length > 0
            ? p.stationScope.stationIds
            : Array.isArray((p as unknown as { stationIds?: string[] }).stationIds) &&
              ((p as unknown as { stationIds?: string[] }).stationIds?.length ?? 0) > 0
              ? ((p as unknown as { stationIds: string[] }).stationIds)
              : p.station?.id
                ? [p.station.id]
                : p.stationId
                  ? [p.stationId]
                  : [];
        rowStations = rawIds.map((id) => ({
          id,
          name: stationsById.get(id) ?? (p.station?.id === id ? p.station.name : id),
        }));
      }

      return {
        id: p.id,
        slug: p.slug,
        titleEn: p.titleEn,
        titleEs: p.titleEs,
        stationIds: rowStations.map((s) => s.id),
        stations: rowStations,
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

  function toggleStations(
    procedureId: string,
    next: Array<{ id: string; name: string }>,
  ): void {
    setStationOverrides((prev) => ({ ...prev, [procedureId]: next }));
    const validIds = next.map((s) => s.id).filter(isUuid);
    if (!isUuid(procedureId)) return;
    void (async () => {
      try {
        const updated = await updateProcedureStation(procedureId, validIds);

        // Optimistically update React Query cache so when override is deleted,
        // it doesn't flicker back to stale data before refetch completes
        queryClient.setQueriesData<Procedure[]>(
          { queryKey: PROCEDURES_QUERY_KEY },
          (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((proc) =>
              proc.id === procedureId
                ? {
                    ...proc,
                    stationIds: validIds,
                    stationScope:
                      validIds.length > 0
                        ? { mode: 'specific', stationIds: validIds }
                        : null,
                    station: updated.station ?? (next[0] ? { id: next[0].id, name: next[0].name } : null),
                  }
                : proc,
            );
          },
        );
      } catch (err) {
        // Rollback override on error
        setStationOverrides((prev) => {
          const copy = { ...prev };
          delete copy[procedureId];
          return copy;
        });
      } finally {
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
        setStationOverrides((prev) => {
          const copy = { ...prev };
          delete copy[procedureId];
          return copy;
        });
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
      <PageHeader
        title={isEs ? category.nameEs : category.nameEn}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={LuPlus} onClick={() => setAddSubcategoryOpen(true)}>
              {isEs ? 'Agregar subcategoría' : 'Add subcategory'}
            </Button>
            <Link href={`/${locale}/admin/library/categories`}>
              <Button variant="secondary">
                {isEs ? 'Volver a categorías' : 'Back to categories'}
              </Button>
            </Link>
          </div>
        }
      />

      <Modal
        open={addSubcategoryOpen}
        onClose={() => {
          if (creatingSubcategory) return;
          setAddSubcategoryOpen(false);
          setSubcategoryError(null);
        }}
        size="md"
      >
        <form
          className="flex min-h-0 max-h-full flex-col"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!categoryId || creatingSubcategory) return;
            const nameEn = newSubcategoryName.en.trim() || newSubcategoryName.es.trim();
            const nameEs = newSubcategoryName.es.trim() || newSubcategoryName.en.trim();
            if (!nameEn || !nameEs) return;
            setCreatingSubcategory(true);
            setSubcategoryError(null);
            try {
              await createBackendSubcategory(categoryId, { nameEn, nameEs, subcategoryIcon: newSubcategoryIcon });
              await queryClient.invalidateQueries({ queryKey: ['categories', 'backend-subcategories', categoryId] });
              await queryClient.invalidateQueries({ queryKey: ['categories', 'all-subcategories'] });
              setAddSubcategoryOpen(false);
              setNewSubcategoryName({ en: '', es: '' });
              setNewSubcategoryIcon('folder');
              setShowSubcategoryIconPicker(false);
            } catch (error) {
              setSubcategoryError(error instanceof Error ? error.message : 'Could not create subcategory.');
            } finally {
              setCreatingSubcategory(false);
            }
          }}
        >
          <ModalHeader
            title={isEs ? 'Agregar subcategoría' : 'Add subcategory'}
            description={isEs ? `Crear una subcategoría en ${category.nameEs}.` : `Create a subcategory in ${category.nameEn}.`}
            onClose={() => {
              if (creatingSubcategory) return;
              setAddSubcategoryOpen(false);
              setSubcategoryError(null);
            }}
          />
          <ModalBody className="max-h-[calc(100dvh-14rem)] overscroll-contain">
            <BilingualInput
              label={isEs ? 'Nombre de subcategoría' : 'Subcategory name'}
              value={newSubcategoryName}
              onChange={setNewSubcategoryName}
              maxLength={200}
              placeholder={{ en: 'e.g. Plating', es: 'p. ej. Emplatado' }}
            />
            <div className="space-y-1.5 mt-4">
              <Label>{isEs ? 'Icono' : 'Icon'}</Label>
              <div className="flex items-center gap-3">
                <IconTile
                  size="md"
                  icon={(AVAILABLE_ICONS.find((i) => i.id === newSubcategoryIcon) ?? AVAILABLE_ICONS[AVAILABLE_ICONS.length - 1]).icon}
                />
                <Button
                  type="button"
                  variant="neutral"
                  icon={LuChevronDown}
                  aria-expanded={showSubcategoryIconPicker}
                  onClick={() => setShowSubcategoryIconPicker(!showSubcategoryIconPicker)}
                >
                  {isEs ? 'Elegir icono' : 'Choose icon'}
                </Button>
              </div>
              {showSubcategoryIconPicker ? (
                <div className="mt-2 grid grid-cols-4 gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = newSubcategoryIcon === item.id;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setNewSubcategoryIcon(item.id);
                          setShowSubcategoryIconPicker(false);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-[var(--radius-md)] border p-2 text-sm transition-colors',
                          isSelected
                            ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)] font-semibold text-[var(--color-brand-700)]'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]',
                        )}
                      >
                        <IconComponent aria-hidden="true" className="text-lg" />
                        <span className="w-full truncate text-center">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {subcategoryError ? <p role="alert" className="text-sm text-[var(--color-bad)]">{subcategoryError}</p> : null}
          </ModalBody>
          <ModalFooter className="mb-3">
            <Button type="button" variant="neutral" disabled={creatingSubcategory} onClick={() => setAddSubcategoryOpen(false)}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" disabled={creatingSubcategory || (!newSubcategoryName.en.trim() && !newSubcategoryName.es.trim())}>
              {creatingSubcategory ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Crear' : 'Create')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {subcategoriesQuery.isError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-3 py-2 text-sm text-[var(--color-bad)]"
        >
          {isEs ? 'No se pudieron cargar las subcategorías.' : 'Could not load subcategories.'}{' '}
          <button
            type="button"
            onClick={() => void subcategoriesQuery.refetch()}
            className="font-semibold underline underline-offset-2"
          >
            {isEs ? 'Reintentar' : 'Retry'}
          </button>
        </p>
      ) : null}

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

      {showSkeleton ? (
        <CategoryDetailSkeleton
          hideHeader
          aria-label={isEs ? 'Cargando subcategorías' : 'Loading subcategories'}
        />
      ) : subcategories.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-ink-3)]">
          {isEs
            ? 'Esta categoría no tiene subcategorías.'
            : 'This category has no subcategories.'}
        </p>
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
              onToggleStation={toggleStations}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

